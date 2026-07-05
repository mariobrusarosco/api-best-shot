import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { CRON_DEFINITION_SERVICE, CRON_RUN_SERVICE } from '@/domains/cron/services';
import { ONE_TIME_SWEEP_INTERVAL_MS } from './config';

export const processDueOneTimeDefinitions = async (runnerInstanceId: string): Promise<void> => {
  const now = new Date();
  const oneTimeDefinitions = await CRON_DEFINITION_SERVICE.listDefinitions({
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
      const queueResult = await CRON_RUN_SERVICE.queueScheduledRun(definition.id, definition.runAt);
      if (!queueResult.run || queueResult.outcome !== 'pending') {
        continue;
      }

      await CRON_RUN_SERVICE.executePendingRun(queueResult.run.id, runnerInstanceId);
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

export const startOneTimeSweep = (params: {
  runnerInstanceId: string;
  isShuttingDown: () => boolean;
}): NodeJS.Timeout => {
  const { runnerInstanceId, isShuttingDown } = params;

  return setInterval(() => {
    if (isShuttingDown()) return;
    void processDueOneTimeDefinitions(runnerInstanceId);
  }, ONE_TIME_SWEEP_INTERVAL_MS);
};
