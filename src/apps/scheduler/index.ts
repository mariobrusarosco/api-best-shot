import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });

import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { SERVICES_CRON } from '@/domains/cron/services';
import { DB_SelectCronJobDefinition } from '@/domains/cron/schema';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';

const NODE_ENV = process.env.NODE_ENV || 'development';

const HEARTBEAT_INTERVAL_MS = 60_000;
const STALE_RUNNING_TIMEOUT_MINUTES = 15;
const STALE_RUNNING_RECOVERY_LIMIT = 500;
const PENDING_RUN_RECOVERY_BATCH_SIZE = 200;
const PENDING_RUN_RECOVERY_MAX_PASSES = 100;
const ACTIVE_RECURRING_DEFINITION_PAGE_SIZE = 500;
const ACTIVE_RECURRING_DEFINITION_MAX_PAGES = 100;
const ONE_TIME_SWEEP_INTERVAL_MS = 15_000;
const STARTUP_FAILURE_CODE = 'startup_stale_timeout';
const STARTUP_FAILURE_MESSAGE = `Marked as failed on scheduler startup after ${STALE_RUNNING_TIMEOUT_MINUTES} minutes timeout`;

let isShuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | null = null;
let oneTimeSweepTimer: NodeJS.Timeout | null = null;
const recurringTaskRegistry = new Map<string, ScheduledTask>();

const stopAllRegisteredRecurringTasks = (): number => {
  let stoppedCount = 0;

  for (const [definitionId, task] of recurringTaskRegistry.entries()) {
    try {
      task.stop();
      stoppedCount += 1;
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'scheduler',
        operation: 'stop_recurring_task',
        definitionId,
      });
    } finally {
      recurringTaskRegistry.delete(definitionId);
    }
  }

  return stoppedCount;
};

const shutdown = (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  Logger.info('Scheduler shutdown requested', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'shutdown',
    signal,
  });

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (oneTimeSweepTimer) {
    clearInterval(oneTimeSweepTimer);
    oneTimeSweepTimer = null;
  }

  const stoppedTasksCount = stopAllRegisteredRecurringTasks();

  Logger.info('Scheduler shutdown completed', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'shutdown',
    stoppedTasksCount,
  });

  process.exit(0);
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

const recoverStaleRunningRunsOnStartup = async (): Promise<void> => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_RUNNING_TIMEOUT_MINUTES * 60 * 1000);

  const staleRuns = await SERVICES_CRON.failStaleRunningRuns({
    staleBefore,
    limit: STALE_RUNNING_RECOVERY_LIMIT,
    failureCode: STARTUP_FAILURE_CODE,
    failureMessage: STARTUP_FAILURE_MESSAGE,
    failureDetails: {
      recoveryPhase: 'scheduler_startup',
      staleBefore: staleBefore.toISOString(),
      timeoutMinutes: STALE_RUNNING_TIMEOUT_MINUTES,
    },
  });

  Logger.info('Scheduler stale-running recovery completed', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'startup_stale_recovery',
    staleBefore: staleBefore.toISOString(),
    timeoutMinutes: STALE_RUNNING_TIMEOUT_MINUTES,
    recoveredRunsCount: staleRuns.length,
    recoveredRunIds: staleRuns.slice(0, 20).map(run => run.id),
  });
};

const buildRunnerInstanceId = (): string => {
  const serviceName = process.env.RAILWAY_SERVICE_NAME || 'scheduler';
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME || NODE_ENV;
  const serviceId = process.env.RAILWAY_SERVICE_ID || 'local';
  return `${serviceName}:${environment}:${serviceId}:${process.pid}`;
};

const recoverPendingRunsOnStartup = async (runnerInstanceId: string): Promise<void> => {
  let recoveredRunsCount = 0;
  let succeededRunsCount = 0;
  let failedRunsCount = 0;
  let executionErrorsCount = 0;
  let passesExecuted = 0;

  for (let pass = 1; pass <= PENDING_RUN_RECOVERY_MAX_PASSES; pass++) {
    const pendingRuns = await SERVICES_CRON.listPendingRuns(PENDING_RUN_RECOVERY_BATCH_SIZE);
    if (pendingRuns.length === 0) {
      break;
    }

    passesExecuted = pass;
    let passProgressCount = 0;

    for (const pendingRun of pendingRuns) {
      try {
        const terminalRun = await SERVICES_CRON.executePendingRun(pendingRun.id, runnerInstanceId);
        recoveredRunsCount += 1;
        passProgressCount += 1;

        if (terminalRun.status === 'succeeded') {
          succeededRunsCount += 1;
        } else if (terminalRun.status === 'failed') {
          failedRunsCount += 1;
        }
      } catch (error) {
        executionErrorsCount += 1;

        Logger.error(error instanceof Error ? error : new Error(String(error)), {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'scheduler',
          operation: 'startup_pending_recovery_execute',
          runId: pendingRun.id,
          jobDefinitionId: pendingRun.jobDefinitionId,
          jobKey: pendingRun.jobKey,
          jobVersion: String(pendingRun.jobVersion),
        });
      }
    }

    if (passProgressCount === 0) {
      Logger.warn('Scheduler pending-run recovery stopped due to zero progress', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'scheduler',
        operation: 'startup_pending_recovery',
        pass,
        batchSize: pendingRuns.length,
      });
      break;
    }
  }

  Logger.info('Scheduler pending-run recovery completed', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'startup_pending_recovery',
    passesExecuted,
    maxPasses: PENDING_RUN_RECOVERY_MAX_PASSES,
    recoveredRunsCount,
    succeededRunsCount,
    failedRunsCount,
    executionErrorsCount,
  });
};

type RecurringTickSource = 'startup_catch_up' | 'cron_tick';

type RecurringTickExecutionResult = {
  outcome: 'pending' | 'skipped' | 'duplicate' | 'error';
  runId: string | null;
  terminalStatus: string | null;
};

const executeRecurringDefinitionTick = async (
  definition: DB_SelectCronJobDefinition,
  runnerInstanceId: string,
  source: RecurringTickSource
): Promise<RecurringTickExecutionResult> => {
  try {
    const queueResult = await SERVICES_CRON.queueScheduledRun(definition.id, new Date());

    if (!queueResult.run) {
      Logger.info('Recurring cron tick produced no run row', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'scheduler',
        operation: 'recurring_tick',
        source,
        definitionId: definition.id,
        jobKey: definition.jobKey,
        version: definition.version,
        queueOutcome: queueResult.outcome,
      });

      return {
        outcome: queueResult.outcome,
        runId: null,
        terminalStatus: null,
      };
    }

    if (queueResult.outcome !== 'pending') {
      Logger.info('Recurring cron tick ended without execution', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'scheduler',
        operation: 'recurring_tick',
        source,
        definitionId: definition.id,
        jobKey: definition.jobKey,
        version: definition.version,
        queueOutcome: queueResult.outcome,
        runId: queueResult.run.id,
        runStatus: queueResult.run.status,
      });

      return {
        outcome: queueResult.outcome,
        runId: queueResult.run.id,
        terminalStatus: queueResult.run.status,
      };
    }

    const terminalRun = await SERVICES_CRON.executePendingRun(queueResult.run.id, runnerInstanceId);

    Logger.info('Recurring cron tick executed', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'recurring_tick',
      source,
      definitionId: definition.id,
      jobKey: definition.jobKey,
      version: definition.version,
      queueOutcome: queueResult.outcome,
      runId: terminalRun.id,
      terminalStatus: terminalRun.status,
    });

    return {
      outcome: queueResult.outcome,
      runId: terminalRun.id,
      terminalStatus: terminalRun.status,
    };
  } catch (error) {
    Logger.error(error instanceof Error ? error : new Error(String(error)), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'recurring_tick',
      source,
      definitionId: definition.id,
      jobKey: definition.jobKey,
      version: String(definition.version),
    });

    return {
      outcome: 'error',
      runId: null,
      terminalStatus: null,
    };
  }
};

const loadActiveRecurringDefinitions = async (): Promise<DB_SelectCronJobDefinition[]> => {
  const definitions: DB_SelectCronJobDefinition[] = [];

  for (let page = 0; page < ACTIVE_RECURRING_DEFINITION_MAX_PAGES; page++) {
    const offset = page * ACTIVE_RECURRING_DEFINITION_PAGE_SIZE;
    const chunk = await SERVICES_CRON.listDefinitions({
      status: 'active',
      scheduleType: 'recurring',
      limit: ACTIVE_RECURRING_DEFINITION_PAGE_SIZE,
      offset,
    });

    if (chunk.length === 0) {
      break;
    }

    definitions.push(...chunk);

    if (chunk.length < ACTIVE_RECURRING_DEFINITION_PAGE_SIZE) {
      break;
    }
  }

  return definitions;
};

const registerRecurringTask = (definition: DB_SelectCronJobDefinition, runnerInstanceId: string): boolean => {
  if (!definition.cronExpression) {
    Logger.warn('Skipping recurring cron definition without cron expression', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'register_recurring_definition',
      definitionId: definition.id,
      jobKey: definition.jobKey,
      version: definition.version,
    });
    return false;
  }

  if (!cron.validate(definition.cronExpression)) {
    Logger.warn('Skipping recurring cron definition with invalid cron expression', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'register_recurring_definition',
      definitionId: definition.id,
      jobKey: definition.jobKey,
      version: definition.version,
      cronExpression: definition.cronExpression,
    });
    return false;
  }

  const timezone = definition.timezone || 'UTC';

  const task = cron.schedule(
    definition.cronExpression,
    () => {
      if (isShuttingDown) return;
      void executeRecurringDefinitionTick(definition, runnerInstanceId, 'cron_tick');
    },
    { timezone }
  );

  recurringTaskRegistry.set(definition.id, task);

  Logger.info('Registered recurring cron definition', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'register_recurring_definition',
    definitionId: definition.id,
    jobKey: definition.jobKey,
    version: definition.version,
    cronExpression: definition.cronExpression,
    timezone,
  });

  return true;
};

const registerRecurringDefinitionsOnStartup = async (runnerInstanceId: string): Promise<void> => {
  const activeRecurringDefinitions = await loadActiveRecurringDefinitions();

  let registeredCount = 0;
  let skippedCount = 0;
  let startupCatchUpTriggeredCount = 0;
  let startupCatchUpExecutedCount = 0;
  let startupCatchUpSkippedCount = 0;
  let startupCatchUpDuplicateCount = 0;
  let startupCatchUpErrorCount = 0;

  for (const definition of activeRecurringDefinitions) {
    const wasRegistered = registerRecurringTask(definition, runnerInstanceId);
    if (wasRegistered) {
      registeredCount += 1;
      startupCatchUpTriggeredCount += 1;

      const catchUpResult = await executeRecurringDefinitionTick(definition, runnerInstanceId, 'startup_catch_up');
      if (catchUpResult.outcome === 'pending') {
        startupCatchUpExecutedCount += 1;
      } else if (catchUpResult.outcome === 'skipped') {
        startupCatchUpSkippedCount += 1;
      } else if (catchUpResult.outcome === 'duplicate') {
        startupCatchUpDuplicateCount += 1;
      } else {
        startupCatchUpErrorCount += 1;
      }
    } else {
      skippedCount += 1;
    }
  }

  Logger.info('Recurring cron registration completed', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'register_recurring_definitions',
    loadedDefinitionsCount: activeRecurringDefinitions.length,
    registeredCount,
    skippedCount,
    startupCatchUpTriggeredCount,
    startupCatchUpExecutedCount,
    startupCatchUpSkippedCount,
    startupCatchUpDuplicateCount,
    startupCatchUpErrorCount,
    activeTaskHandlesCount: recurringTaskRegistry.size,
  });
};

const processDueOneTimeDefinitions = async (runnerInstanceId: string): Promise<void> => {
  const now = new Date();
  const oneTimeDefinitions = await SERVICES_CRON.listDefinitions({
    status: 'active',
    scheduleType: 'one_time',
    limit: 1000,
    offset: 0,
  });

  for (const definition of oneTimeDefinitions) {
    if (!definition.runAt || definition.runAt.getTime() > now.getTime()) {
      continue;
    }

    try {
      const queueResult = await SERVICES_CRON.queueScheduledRun(definition.id, definition.runAt);
      if (!queueResult.run || queueResult.outcome !== 'pending') {
        continue;
      }

      await SERVICES_CRON.executePendingRun(queueResult.run.id, runnerInstanceId);
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'scheduler',
        operation: 'one_time_sweep',
        definitionId: definition.id,
        jobKey: definition.jobKey,
        version: String(definition.version),
      });
    }
  }
};

const startHeartbeat = (): void => {
  heartbeatTimer = setInterval(() => {
    Logger.info('Scheduler heartbeat', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'heartbeat',
      intervalMs: HEARTBEAT_INTERVAL_MS,
    });
  }, HEARTBEAT_INTERVAL_MS);
};

const startOneTimeSweep = (runnerInstanceId: string): void => {
  oneTimeSweepTimer = setInterval(() => {
    if (isShuttingDown) return;
    void processDueOneTimeDefinitions(runnerInstanceId);
  }, ONE_TIME_SWEEP_INTERVAL_MS);
};

const bootstrap = async (): Promise<void> => {
  Logger.info('Starting Best Shot Scheduler runtime', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'bootstrap_start',
    environment: NODE_ENV,
  });

  const runnerInstanceId = buildRunnerInstanceId();

  await recoverStaleRunningRunsOnStartup();
  await recoverPendingRunsOnStartup(runnerInstanceId);
  await processDueOneTimeDefinitions(runnerInstanceId);
  await registerRecurringDefinitionsOnStartup(runnerInstanceId);

  // E6 complete; shutdown edge cases are implemented in later Phase E tasks.
  Logger.info('Scheduler runtime initialized', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'bootstrap',
    activeRecurringTaskHandles: recurringTaskRegistry.size,
    runnerInstanceId,
  });

  startOneTimeSweep(runnerInstanceId);
  startHeartbeat();
};

process.on('uncaughtException', err => {
  Logger.error(err, { domain: DOMAINS.DATA_PROVIDER, component: 'scheduler', operation: 'uncaughtException' });
});

process.on('unhandledRejection', reason => {
  Logger.error(reason instanceof Error ? reason : new Error(String(reason)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'unhandledRejection',
  });
});

bootstrap().catch(error => {
  Logger.error(error instanceof Error ? error : new Error(String(error)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'bootstrap',
  });
  process.exit(1);
});
