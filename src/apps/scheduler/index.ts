import { config } from 'dotenv';

config({ path: process.env.ENV_PATH || '.env' });

import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { ScheduledTask } from 'node-cron';
import { buildRunnerInstanceId, NODE_ENV } from './config';
import { startHeartbeat } from './heartbeat';
import { registerProcessErrorHandlers, registerShutdownHandlers } from './lifecycle';
import { processDueOneTimeDefinitions, startOneTimeSweep } from './one-time';
import { registerRecurringDefinitionsOnStartup, stopAllRegisteredRecurringTasks } from './recurring';
import { recoverPendingRunsOnStartup, recoverStaleRunningRunsOnStartup } from './startup-recovery';

let isShuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | null = null;
let oneTimeSweepTimer: NodeJS.Timeout | null = null;
const recurringTaskRegistry = new Map<string, ScheduledTask>();

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

  const stoppedTasksCount = stopAllRegisteredRecurringTasks(recurringTaskRegistry);

  Logger.info('Scheduler shutdown completed', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'shutdown',
    stoppedTasksCount,
  });

  process.exit(0);
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
  await registerRecurringDefinitionsOnStartup({
    runnerInstanceId,
    recurringTaskRegistry,
    isShuttingDown: () => isShuttingDown,
  });

  Logger.info('Scheduler runtime initialized', {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'bootstrap',
    activeRecurringTaskHandles: recurringTaskRegistry.size,
    runnerInstanceId,
  });

  oneTimeSweepTimer = startOneTimeSweep({
    runnerInstanceId,
    isShuttingDown: () => isShuttingDown,
  });
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
