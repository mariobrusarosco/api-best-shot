export const NODE_ENV = process.env.NODE_ENV || 'development';

export const HEARTBEAT_INTERVAL_MS = 60_000 * 30;
export const STALE_RUNNING_TIMEOUT_MINUTES = 15;
export const STALE_RUNNING_RECOVERY_LIMIT = 500;
export const PENDING_RUN_RECOVERY_BATCH_SIZE = 200;
export const PENDING_RUN_RECOVERY_MAX_PASSES = 100;
export const ACTIVE_RECURRING_DEFINITION_PAGE_SIZE = 500;
export const ACTIVE_RECURRING_DEFINITION_MAX_PAGES = 100;
export const ONE_TIME_SWEEP_INTERVAL_MS = 15_000;
export const STARTUP_FAILURE_CODE = 'startup_stale_timeout';
export const STARTUP_FAILURE_MESSAGE = `Marked as failed on scheduler startup after ${STALE_RUNNING_TIMEOUT_MINUTES} minutes timeout`;

export const buildRunnerInstanceId = (): string => {
  const serviceName = process.env.RAILWAY_SERVICE_NAME || 'scheduler';
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME || NODE_ENV;
  const serviceId = process.env.RAILWAY_SERVICE_ID || 'local';
  return `${serviceName}:${environment}:${serviceId}:${process.pid}`;
};
