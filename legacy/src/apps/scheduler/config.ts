export const NODE_ENV = process.env.NODE_ENV || 'development';

export const HEARTBEAT_INTERVAL_MS = 60_000 * 30;
export const ACTIVE_RECURRING_DEFINITION_PAGE_SIZE = 500;
export const ACTIVE_RECURRING_DEFINITION_MAX_PAGES = 100;
export const ONE_TIME_SWEEP_INTERVAL_MS = 15_000;
export const STARTUP_DEFERRED_FAILURE_CODE = 'startup_deferred';
export const STARTUP_DEFERRED_FAILURE_MESSAGE = 'Run deferred on scheduler startup; manual replay required';

export const buildRunnerInstanceId = (): string => {
  const serviceName = process.env.RAILWAY_SERVICE_NAME || 'scheduler';
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME || NODE_ENV;
  const serviceId = process.env.RAILWAY_SERVICE_ID || 'local';
  return `${serviceName}:${environment}:${serviceId}:${process.pid}`;
};
