import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { CRON_RUN_SERVICE } from '@/domains/cron/services';
import {
  PENDING_RUN_RECOVERY_BATCH_SIZE,
  PENDING_RUN_RECOVERY_MAX_PASSES,
  STALE_RUNNING_RECOVERY_LIMIT,
  STALE_RUNNING_TIMEOUT_MINUTES,
  STARTUP_FAILURE_CODE,
  STARTUP_FAILURE_MESSAGE,
} from './config';

export const recoverStaleRunningRunsOnStartup = async (): Promise<void> => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_RUNNING_TIMEOUT_MINUTES * 60 * 1000);

  const staleRuns = await CRON_RUN_SERVICE.failStaleRunningRuns({
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

export const recoverPendingRunsOnStartup = async (runnerInstanceId: string): Promise<void> => {
  let recoveredRunsCount = 0;
  let succeededRunsCount = 0;
  let failedRunsCount = 0;
  let executionErrorsCount = 0;
  let passesExecuted = 0;

  for (let pass = 1; pass <= PENDING_RUN_RECOVERY_MAX_PASSES; pass++) {
    const pendingRuns = await CRON_RUN_SERVICE.listPendingRuns(PENDING_RUN_RECOVERY_BATCH_SIZE);
    if (pendingRuns.length === 0) {
      break;
    }

    passesExecuted = pass;
    let passProgressCount = 0;

    for (const pendingRun of pendingRuns) {
      try {
        const terminalRun = await CRON_RUN_SERVICE.executePendingRun(pendingRun.id, runnerInstanceId);
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
