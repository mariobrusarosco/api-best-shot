import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });

import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { env } from '@/config/env';
import { SERVICES_CRON } from '@/domains/cron/services';
import { DB_SelectCronJobDefinition } from '@/domains/cron/schema';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';

const HEARTBEAT_INTERVAL_MS = 60_000;
const STALE_RUNNING_TIMEOUT_MINUTES = 15;
const STALE_RUNNING_RECOVERY_LIMIT = 500;
const PENDING_RUN_RECOVERY_BATCH_SIZE = 200;
const PENDING_RUN_RECOVERY_MAX_PASSES = 100;
const ACTIVE_RECURRING_DEFINITION_PAGE_SIZE = 500;
const ACTIVE_RECURRING_DEFINITION_MAX_PAGES = 100;
const STARTUP_FAILURE_CODE = 'startup_stale_timeout';
const STARTUP_FAILURE_MESSAGE = `Marked as failed on scheduler startup after ${STALE_RUNNING_TIMEOUT_MINUTES} minutes timeout`;

let isShuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | null = null;
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
    component: 'scheduler',
    operation: 'shutdown',
    signal,
  });

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  const stoppedTasksCount = stopAllRegisteredRecurringTasks();

  Logger.info('Scheduler shutdown completed', {
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
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME || env.NODE_ENV;
  const serviceId = process.env.RAILWAY_SERVICE_ID || 'local';
  return `${serviceName}:${environment}:${serviceId}:${process.pid}`;
};

const recoverPendingRunsOnStartup = async (): Promise<void> => {
  const runnerInstanceId = buildRunnerInstanceId();

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
        component: 'scheduler',
        operation: 'startup_pending_recovery',
        pass,
        batchSize: pendingRuns.length,
      });
      break;
    }
  }

  Logger.info('Scheduler pending-run recovery completed', {
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

const registerRecurringTask = (definition: DB_SelectCronJobDefinition): boolean => {
  if (!definition.cronExpression) {
    Logger.warn('Skipping recurring cron definition without cron expression', {
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
      Logger.info('Recurring cron tick received', {
        component: 'scheduler',
        operation: 'cron_tick',
        definitionId: definition.id,
        jobKey: definition.jobKey,
        version: definition.version,
        cronExpression: definition.cronExpression,
        timezone,
      });
    },
    { timezone }
  );

  recurringTaskRegistry.set(definition.id, task);

  Logger.info('Registered recurring cron definition', {
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

const registerRecurringDefinitionsOnStartup = async (): Promise<void> => {
  const activeRecurringDefinitions = await loadActiveRecurringDefinitions();

  let registeredCount = 0;
  let skippedCount = 0;

  for (const definition of activeRecurringDefinitions) {
    const wasRegistered = registerRecurringTask(definition);
    if (wasRegistered) {
      registeredCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  Logger.info('Recurring cron registration completed', {
    component: 'scheduler',
    operation: 'register_recurring_definitions',
    loadedDefinitionsCount: activeRecurringDefinitions.length,
    registeredCount,
    skippedCount,
    activeTaskHandlesCount: recurringTaskRegistry.size,
  });
};

const startHeartbeat = (): void => {
  heartbeatTimer = setInterval(() => {
    Logger.info('Scheduler heartbeat', {
      component: 'scheduler',
      operation: 'heartbeat',
      intervalMs: HEARTBEAT_INTERVAL_MS,
    });
  }, HEARTBEAT_INTERVAL_MS);
};

const bootstrap = async (): Promise<void> => {
  Logger.info('Starting Best Shot Scheduler runtime', {
    environment: env.NODE_ENV,
  });

  await recoverStaleRunningRunsOnStartup();
  await recoverPendingRunsOnStartup();
  await registerRecurringDefinitionsOnStartup();

  // E4 complete; timer callbacks are implemented in later Phase E tasks.
  Logger.info('Scheduler runtime initialized', {
    component: 'scheduler',
    operation: 'bootstrap',
    activeRecurringTaskHandles: recurringTaskRegistry.size,
  });

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
