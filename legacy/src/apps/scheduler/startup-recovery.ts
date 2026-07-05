import Logger from '@/core/logger';
import { CRON_RUN_SERVICE } from '@/domains/cron/services';
import { STARTUP_DEFERRED_FAILURE_CODE, STARTUP_DEFERRED_FAILURE_MESSAGE } from './config';

export const deferInFlightRunsOnStartup = async (): Promise<void> => {
  const startupTimestamp = new Date().toISOString();
  const failure = {
    failureCode: STARTUP_DEFERRED_FAILURE_CODE,
    failureMessage: STARTUP_DEFERRED_FAILURE_MESSAGE,
    failureDetails: {
      recoveryPhase: 'scheduler_startup',
      startupTimestamp,
      replayPolicy: 'manual_only',
    },
  };

  const skippedRunningRuns = await CRON_RUN_SERVICE.skipRunningRuns(failure);
  const skippedPendingRuns = await CRON_RUN_SERVICE.skipPendingRuns(failure);

  Logger.info(
    `Scheduler startup run deferral completed startupTimestamp=${startupTimestamp} skippedRunning=${skippedRunningRuns.length} skippedPending=${skippedPendingRuns.length} totalDeferred=${skippedRunningRuns.length + skippedPendingRuns.length}`
  );
};
