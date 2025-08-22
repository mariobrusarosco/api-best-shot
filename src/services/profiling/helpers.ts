import {
  Domain,
  Component,
  Operation,
  Resource,
  Status,
  Environment,
  MESSAGE_PREFIXES,
  ENVIRONMENTS,
} from './constants';

/**
 * Standard tag structure for Sentry logging
 */
export interface LogTags {
  domain?: Domain;
  component?: Component;
  operation?: Operation;
  resource?: Resource;
  environment?: Environment;
  status?: Status;
  [key: string]: string | undefined;
}

/**
 * Standard extra data structure for Sentry logging
 */
export interface LogExtra {
  timestamp?: string;
  duration?: string;
  requestId?: string;
  userId?: string;
  tournamentId?: string;
  apiResponse?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

/**
 * Generates a standardized message format
 */
export function createLogMessage(
  component: Component,
  operation: Operation,
  resource?: Resource,
  status?: Status,
  customSuffix?: string
): string {
  const prefix = MESSAGE_PREFIXES[component];
  let message = `${prefix} | ${operation}`;

  if (resource) {
    message += ` ${resource}`;
  }

  if (status) {
    message += ` | ${status}`;
  }

  if (customSuffix) {
    message += ` | ${customSuffix}`;
  }

  return message;
}

/**
 * Creates standardized tags with automatic environment detection
 */
export function createLogTags(
  options: Omit<LogTags, 'environment'> & {
    environment?: Environment;
  }
): LogTags {
  const autoEnvironment = (process.env.NODE_ENV as Environment) || ENVIRONMENTS.DEVELOPMENT;

  return {
    ...options,
    environment: options.environment || autoEnvironment,
  };
}

/**
 * Creates standardized extra data with timestamp
 */
export function createLogExtra(data: LogExtra = {}): LogExtra {
  return {
    timestamp: new Date().toISOString(),
    ...data,
  };
}

/**
 * Helper for Lambda function logging
 */
export function createLambdaLogMessage(
  operation: Operation,
  resource?: Resource,
  status?: Status,
  environment?: Environment
): string {
  let message = createLogMessage('LAMBDA', operation, resource, status);

  if (environment) {
    message += ` | ${environment}`;
  }

  return message;
}

/**
 * Helper for API logging with version support
 */
export function createApiLogMessage(
  operation: Operation,
  resource?: Resource,
  version?: string,
  status?: Status
): string {
  let message = createLogMessage('API', operation, resource, status);

  if (version) {
    message += ` | v${version}`;
  }

  return message;
}

/**
 * Helper for Service logging
 */
export function createServiceLogMessage(operation: Operation, resource?: Resource, status?: Status): string {
  return createLogMessage('SERVICE', operation, resource, status);
}

/**
 * Helper for Scheduler logging
 */
export function createSchedulerLogMessage(
  operation: Operation,
  environment?: Environment,
  customSuffix?: string
): string {
  let message = createLogMessage('SCHEDULER', operation);

  if (environment) {
    message += ` | ${environment}`;
  }

  if (customSuffix) {
    message += ` | ${customSuffix}`;
  }

  return message;
}

/**
 * Helper for backward compatibility with existing source strings
 */
export function migrateSourceToTags(source: string): LogTags {
  const tags: LogTags = {};

  // Extract domain
  if (source.includes('DATA_PROVIDER')) tags.domain = 'DATA_PROVIDER';
  else if (source.includes('TOURNAMENT')) tags.domain = 'TOURNAMENT';
  else if (source.includes('AUTH')) tags.domain = 'AUTH';
  else if (source.includes('GUESS')) tags.domain = 'GUESS';

  // Extract component
  if (source.includes('API')) tags.component = 'API';
  else if (source.includes('SERVICE')) tags.component = 'SERVICE';
  else if (source.includes('CONTROLLER')) tags.component = 'CONTROLLER';
  else if (source.includes('SCHEDULER')) tags.component = 'SCHEDULER';
  else if (source.includes('SCRAPER')) tags.component = 'SCRAPER';

  // Extract resource
  if (source.includes('STANDINGS')) tags.resource = 'STANDINGS';
  else if (source.includes('MATCHES')) tags.resource = 'MATCHES';
  else if (source.includes('TEAMS')) tags.resource = 'TEAMS';
  else if (source.includes('ROUNDS')) tags.resource = 'ROUNDS';
  else if (source.includes('TOURNAMENT')) tags.resource = 'TOURNAMENTS';

  // Extract operation
  if (source.includes('create') || source.includes('CREATE')) tags.operation = 'CREATE';
  else if (source.includes('update') || source.includes('UPDATE')) tags.operation = 'UPDATE';
  else if (source.includes('fetch') || source.includes('FETCH')) tags.operation = 'FETCH';
  else if (source.includes('generate') || source.includes('GENERATE')) tags.operation = 'GENERATE';

  return createLogTags(tags);
}
