/**
 * Enhanced logging utilities for standardized Sentry integration
 *
 * This module provides convenient functions for consistent logging across the application
 * with proper tagging and message formatting.
 */

import { Profiling } from './index';
import {
  createLambdaLogMessage,
  createApiLogMessage,
  createServiceLogMessage,
  createSchedulerLogMessage,
  createLogTags,
  LogTags,
  LogExtra,
} from './helpers';

import { DOMAINS, COMPONENTS, STATUSES } from './constants';
import type { Operation, Resource, Environment } from './constants';

/**
 * Lambda logging utilities
 */
export const LambdaLogger = {
  success: (
    operation: Operation,
    resource?: Resource,
    environment?: Environment,
    extra?: LogExtra
  ) => {
    const message = createLambdaLogMessage(
      operation,
      resource,
      STATUSES.SUCCESS,
      environment
    );
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.LAMBDA,
      operation,
      resource,
      status: STATUSES.SUCCESS,
    });

    return Profiling.logEnhanced({ message, tags, extra });
  },

  error: (
    operation: Operation,
    error: unknown,
    resource?: Resource,
    environment?: Environment,
    extra?: LogExtra
  ) => {
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.LAMBDA,
      operation,
      resource,
      status: STATUSES.ERROR,
      environment,
    });

    return Profiling.errorEnhanced({ error, tags, extra });
  },

  started: (
    operation: Operation,
    resource?: Resource,
    environment?: Environment,
    extra?: LogExtra
  ) => {
    const message = createLambdaLogMessage(
      operation,
      resource,
      STATUSES.STARTED,
      environment
    );
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.LAMBDA,
      operation,
      resource,
      status: STATUSES.STARTED,
    });

    return Profiling.logEnhanced({ message, tags, extra });
  },
};

/**
 * API logging utilities
 */
export const ApiLogger = {
  success: (
    operation: Operation,
    resource?: Resource,
    version?: string,
    extra?: LogExtra
  ) => {
    const message = createApiLogMessage(operation, resource, version, STATUSES.SUCCESS);
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.API,
      operation,
      resource,
      status: STATUSES.SUCCESS,
    });

    return Profiling.logEnhanced({ message, tags, extra });
  },

  error: (
    operation: Operation,
    error: unknown,
    resource?: Resource,
    version?: string,
    extra?: LogExtra
  ) => {
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.API,
      operation,
      resource,
      status: STATUSES.ERROR,
    });

    return Profiling.errorEnhanced({ error, tags, extra: { ...extra, version } });
  },
};

/**
 * Service logging utilities
 */
export const ServiceLogger = {
  success: (operation: Operation, resource?: Resource, extra?: LogExtra) => {
    const message = createServiceLogMessage(operation, resource, STATUSES.SUCCESS);
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.SERVICE,
      operation,
      resource,
      status: STATUSES.SUCCESS,
    });

    return Profiling.logEnhanced({ message, tags, extra });
  },

  error: (
    operation: Operation,
    error: unknown,
    resource?: Resource,
    extra?: LogExtra
  ) => {
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.SERVICE,
      operation,
      resource,
      status: STATUSES.ERROR,
    });

    return Profiling.errorEnhanced({ error, tags, extra });
  },
};

/**
 * Scheduler logging utilities
 */
export const SchedulerLogger = {
  success: (
    operation: Operation,
    environment?: Environment,
    customSuffix?: string,
    extra?: LogExtra
  ) => {
    const message = createSchedulerLogMessage(operation, environment, customSuffix);
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.SCHEDULER,
      operation,
      status: STATUSES.SUCCESS,
    });

    return Profiling.logEnhanced({ message, tags, extra });
  },

  error: (
    operation: Operation,
    error: unknown,
    environment?: Environment,
    extra?: LogExtra
  ) => {
    const tags = createLogTags({
      domain: DOMAINS.DATA_PROVIDER,
      component: COMPONENTS.SCHEDULER,
      operation,
      status: STATUSES.ERROR,
      environment,
    });

    return Profiling.errorEnhanced({ error, tags, extra });
  },
};

/**
 * Generic enhanced logger for custom scenarios
 */
export const EnhancedLogger = {
  log: (message: string, tags?: LogTags, extra?: LogExtra) => {
    return Profiling.logEnhanced({ message, tags, extra });
  },

  error: (error: unknown, tags?: LogTags, extra?: LogExtra) => {
    return Profiling.errorEnhanced({ error, tags, extra });
  },
};

// Export constants for easy access
export {
  DOMAINS,
  COMPONENTS,
  OPERATIONS,
  RESOURCES,
  STATUSES,
  ENVIRONMENTS,
} from './constants';
