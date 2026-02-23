import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { DB_SelectCronJobDefinition } from '@/domains/cron/schema';
import { CRON_DEFINITION_SERVICE, CRON_RUN_SERVICE } from '@/domains/cron/services';
import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { ACTIVE_RECURRING_DEFINITION_MAX_PAGES, ACTIVE_RECURRING_DEFINITION_PAGE_SIZE } from './config';

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
    const queueResult = await CRON_RUN_SERVICE.queueScheduledRun(definition.id, new Date());

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

    const terminalRun = await CRON_RUN_SERVICE.executePendingRun(queueResult.run.id, runnerInstanceId);

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
    const chunk = await CRON_DEFINITION_SERVICE.listDefinitions({
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

const registerRecurringTask = (params: {
  definition: DB_SelectCronJobDefinition;
  runnerInstanceId: string;
  isShuttingDown: () => boolean;
  recurringTaskRegistry: Map<string, ScheduledTask>;
}): boolean => {
  const { definition, runnerInstanceId, isShuttingDown, recurringTaskRegistry } = params;

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
      if (isShuttingDown()) return;
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

export const stopAllRegisteredRecurringTasks = (recurringTaskRegistry: Map<string, ScheduledTask>): number => {
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

export const registerRecurringDefinitionsOnStartup = async (params: {
  runnerInstanceId: string;
  isShuttingDown: () => boolean;
  recurringTaskRegistry: Map<string, ScheduledTask>;
}): Promise<void> => {
  const { runnerInstanceId, isShuttingDown, recurringTaskRegistry } = params;
  const activeRecurringDefinitions = await loadActiveRecurringDefinitions();

  let registeredCount = 0;
  let skippedCount = 0;
  let startupCatchUpTriggeredCount = 0;
  let startupCatchUpExecutedCount = 0;
  let startupCatchUpSkippedCount = 0;
  let startupCatchUpDuplicateCount = 0;
  let startupCatchUpErrorCount = 0;

  for (const definition of activeRecurringDefinitions) {
    const wasRegistered = registerRecurringTask({
      definition,
      runnerInstanceId,
      isShuttingDown,
      recurringTaskRegistry,
    });

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
