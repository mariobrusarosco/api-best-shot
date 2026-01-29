/**
 * Unified Logger Service
 *
 * This service provides a single, consistent interface for all application logging.
 * It intelligently handles routing logs to the console and/or Sentry based on the
 * current environment.
 *
 * - In 'development', logs are printed to the console with colors.
 * - In 'production', 'staging', or 'demo', logs are sent to Sentry and
 *   also printed to the console.
 */
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import * as pc from 'picocolors';
import { env } from '@/config/env';
import { LogTags, LogExtra } from './types';

// Determine if Sentry should be enabled
const isSentryEnabled = ['production', 'staging', 'demo'].includes(env.NODE_ENV);

// Initialize Sentry if enabled
if (isSentryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

class LoggerService {
  /**
   * Logs an informational message.
   * @param message - The main log message.
   * @param context - Optional structured data.
   */
  public info(message: string, context?: LogExtra): void {
    const finalContext = { ...context, timestamp: new Date().toISOString() };
    console.log(pc.blue(`[INFO] ${message}`), finalContext);

    if (isSentryEnabled) {
      Sentry.captureMessage(message, {
        level: 'info',
        extra: finalContext,
      });
    }
  }

  /**
   * Logs a warning message.
   * @param message - The warning message.
   * @param context - Optional structured data.
   */
  public warn(message: string, context?: LogExtra): void {
    const finalContext = { ...context, timestamp: new Date().toISOString() };
    console.warn(pc.yellow(`[WARN] ${message}`), finalContext);

    if (isSentryEnabled) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: finalContext,
      });
    }
  }

  /**
   * Logs an error. This is the primary method for reporting exceptions.
   * @param error - The error object.
   * @param context - Structured data, including tags for Sentry.
   *                 - domain: Required, strict enum (DOMAINS)
   *                 - operation: Required, flexible string
   *                 - component: Optional, flexible string
   */
  public error(error: Error, context: LogTags & LogExtra): void {
    const { domain, component, operation, ...restOfContext } = context;
    const finalContext = { ...restOfContext, timestamp: new Date().toISOString() };

    // Build tags object, only including component if provided
    const finalTags: Record<string, string> = {
      domain,
      operation,
      environment: env.NODE_ENV,
    };
    if (component) {
      finalTags.component = component;
    }

    console.error(pc.red(`[ERROR] ${error.message}`), {
      tags: finalTags,
      extra: finalContext,
      stack: error.stack,
    });

    if (isSentryEnabled) {
      Sentry.captureException(error, {
        tags: finalTags,
        extra: finalContext,
      });
    }
  }
}

// Export a singleton instance
export const Logger = new LoggerService();
export default Logger;
