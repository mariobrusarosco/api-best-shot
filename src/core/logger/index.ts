/**
 * Unified Logger Service
 *
 * This service provides a single, consistent interface for all application logging.
 * It intelligently handles routing logs to the console and/or Sentry based on the
 * current environment.
 *
 * - In 'development', logs are printed to the console with colors.
 * - In 'production', 'staging', or 'demo', only events/warnings/errors are sent to Sentry.
 */

import type { LogExtra, LogTags } from '@/core/logger/types';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { createColors, isColorSupported } from 'picocolors';

const NODE_ENV = process.env.NODE_ENV || 'development';
const SENTRY_DSN = process.env.SENTRY_DSN || '';

// Determine if Sentry should be enabled
const isSentryEnabled = ['production', 'staging', 'demo'].includes(NODE_ENV) && SENTRY_DSN.trim().length > 0;
const pc = createColors(NODE_ENV === 'development' || isColorSupported);

// Initialize Sentry if enabled
if (isSentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
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
    console.log(`${pc.blue('[INFO]')} ${message}`, context);
  }

  public audit(message: string, context?: LogExtra): void {
    console.log(`${pc.magenta('[AUDIT]')}`, message, context);

    if (isSentryEnabled) {
      Sentry.captureMessage('AUDIT_EVENT', {
        level: 'info',
        extra: context,
      });
    }
  }

  /**
   * Logs a warning message.
   * @param message - The warning message.
   * @param context - Optional structured data.
   */
  public warn(message: string, context?: LogExtra): void {
    console.warn(`${pc.yellow('[WARN]')} ${message}`, context);

    if (isSentryEnabled) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context || undefined,
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
    const { domain, component, operation } = context;

    // Build tags object, only including component if provided
    const finalTags: Record<string, string> = {
      domain,
      operation,
      environment: NODE_ENV,
    };
    if (component) {
      finalTags.component = component;
    }

    console.error(pc.red(`[ERROR] ${error.message} /// ${error.stack}`));

    if (isSentryEnabled) {
      Sentry.captureException(error, {
        tags: finalTags,
        extra: context,
      });
    }
  }
}

// Export a singleton instance
export const Logger = new LoggerService();
export default Logger;
