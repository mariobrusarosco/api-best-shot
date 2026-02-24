import { config } from 'dotenv';

config({ path: process.env.ENV_PATH || '.env' });

import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { ScheduledTask } from 'node-cron';
import { buildRunnerInstanceId, NODE_ENV, ONE_TIME_SWEEP_INTERVAL_MS } from './config';
import { startHeartbeat } from './heartbeat';
import { registerProcessErrorHandlers, registerShutdownHandlers } from './lifecycle';
import { processDueOneTimeDefinitions } from './one-time';
import {
  registerRecurringDefinitionsOnStartup,
  stopAllRegisteredRecurringTasks,
  syncRecurringDefinitions,
} from './recurring';
import { deferInFlightRunsOnStartup } from './startup-recovery';

let isShuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | null = null;
let oneTimeSweepTimer: NodeJS.Timeout | null = null;
const recurringTaskRegistry = new Map<string, ScheduledTask>();

const shutdown = (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  Logger.info(`Scheduler shutdown requested: ${signal}`);

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (oneTimeSweepTimer) {
    clearInterval(oneTimeSweepTimer);
    oneTimeSweepTimer = null;
  }

  void stopAllRegisteredRecurringTasks(recurringTaskRegistry);

  Logger.info('Scheduler shutdown completed');

  process.exit(0);
};

const bootstrap = async (): Promise<void> => {
  Logger.info(`Starting Best Shot Scheduler runtime env=${NODE_ENV}`);

  const runnerInstanceId = buildRunnerInstanceId();

  await deferInFlightRunsOnStartup();
  await processDueOneTimeDefinitions(runnerInstanceId);
  await registerRecurringDefinitionsOnStartup({
    runnerInstanceId,
    recurringTaskRegistry,
    isShuttingDown: () => isShuttingDown,
  });

  Logger.info(
    `Scheduler runtime initialized activeRecurringTaskHandles=${recurringTaskRegistry.size} runnerInstanceId=${runnerInstanceId}`
  );

  oneTimeSweepTimer = setInterval(() => {
    if (isShuttingDown) return;

    void processDueOneTimeDefinitions(runnerInstanceId);
    void syncRecurringDefinitions({
      runnerInstanceId,
      recurringTaskRegistry,
      isShuttingDown: () => isShuttingDown,
    });
  }, ONE_TIME_SWEEP_INTERVAL_MS);
  heartbeatTimer = startHeartbeat();
};

registerShutdownHandlers(shutdown);
registerProcessErrorHandlers();

bootstrap().catch(error => {
  Logger.error(error instanceof Error ? error : new Error(String(error)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'bootstrap',
  });
  process.exit(1);
});
