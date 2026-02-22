import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });

import { env } from '@/config/env';
import { SERVICES_CRON } from '@/domains/cron/services';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';

const HEARTBEAT_INTERVAL_MS = 60_000;
const STALE_RUNNING_TIMEOUT_MINUTES = 15;
const STALE_RUNNING_RECOVERY_LIMIT = 500;
const STARTUP_FAILURE_CODE = 'startup_stale_timeout';
const STARTUP_FAILURE_MESSAGE = `Marked as failed on scheduler startup after ${STALE_RUNNING_TIMEOUT_MINUTES} minutes timeout`;

let isShuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | null = null;

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

  Logger.info('Scheduler shutdown completed', {
    component: 'scheduler',
    operation: 'shutdown',
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

  // E2 complete; recurring orchestration is implemented in later Phase E tasks.
  Logger.info('Scheduler runtime initialized. No recurring jobs are registered yet.', {
    component: 'scheduler',
    operation: 'bootstrap',
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
