import * as Sentry from '@sentry/node';
import * as pc from 'picocolors';
import { LogTags, LogExtra, migrateSourceToTags, createLogTags, createLogExtra } from './helpers';
import { STATUSES } from './constants';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo' || ENV === 'staging';

// Enhanced logging interfaces
export interface EnhancedLogOptions {
  message: string;
  tags?: LogTags;
  extra?: LogExtra;
}

export interface EnhancedErrorOptions {
  error: unknown;
  tags?: LogTags;
  extra?: LogExtra;
}

// Legacy interfaces for backward compatibility
export interface LegacyLogOptions {
  msg: string;
  data?: unknown;
  source?: string;
}

export interface LegacyErrorOptions {
  source?: string;
  error: unknown;
  data?: unknown;
}

export const Profiling = {
  // Enhanced logging methods
  logEnhanced: ({ message, tags, extra }: EnhancedLogOptions) => {
    const finalTags = createLogTags(tags || {});
    const finalExtra = createLogExtra(extra || {});

    if (enableProfiling) {
      return Sentry.captureMessage(message, {
        level: 'info',
        tags: finalTags,
        extra: finalExtra,
      });
    }

    console.log('\n');
    console.log(pc.bgBlue(pc.bold('------START ENHANCED LOG------')));
    console.log(pc.magenta(`MSG: ${message}`));
    console.log(pc.cyan(`TAGS: ${JSON.stringify(finalTags, null, 2)}`));
    console.log(pc.yellow(`EXTRA: ${JSON.stringify(finalExtra, null, 2)}`));
    console.log(pc.bgBlue(pc.bold('------END ENHANCED LOG------')));
    console.log('\n');
  },

  errorEnhanced: ({ error, tags, extra }: EnhancedErrorOptions) => {
    const finalTags = createLogTags({ ...tags, status: STATUSES.ERROR });
    const finalExtra = createLogExtra({ ...extra, error });

    if (enableProfiling) {
      return Sentry.captureException(error, {
        tags: finalTags,
        extra: finalExtra,
      });
    }

    console.log(pc.bgRed(pc.bold('------START ENHANCED ERROR------')));
    console.error(error);
    console.log(pc.cyan(`TAGS: ${JSON.stringify(finalTags, null, 2)}`));
    console.log(pc.yellow(`EXTRA: ${JSON.stringify(finalExtra, null, 2)}`));
    console.log(pc.bgRed(pc.bold('------END ENHANCED ERROR------')));
  },

  // Legacy methods with automatic migration (backward compatibility)
  log: ({ msg, data, source }: LegacyLogOptions) => {
    if (source) {
      // Migrate legacy source to new tag system
      const migratedTags = migrateSourceToTags(source);
      return Profiling.logEnhanced({
        message: msg,
        tags: migratedTags,
        extra: { data, legacySource: source },
      });
    }

    // Fallback to basic logging without tags
    if (enableProfiling) {
      return Sentry.captureMessage(msg, {
        level: 'info',
        extra: { data },
      });
    }

    console.log('\n');
    console.log(pc.bgWhite(pc.bold('------START LOG------')));
    msg && console.log(pc.magenta(`MSG: ${msg}`));
    data && console.log(pc.yellow(`DATA: ${JSON.stringify(data, null, 2)}`));
    console.log(pc.bgWhite(pc.bold('------END LOG------')));
    console.log('\n');
  },

  error: ({ source, error, data }: LegacyErrorOptions) => {
    if (source) {
      // Migrate legacy source to new tag system
      const migratedTags = migrateSourceToTags(source);
      return Profiling.errorEnhanced({
        error,
        tags: migratedTags,
        extra: { data, legacySource: source },
      });
    }

    // Fallback to basic error logging
    const finalMessage = `[${ENV}] - [ERROR]`;

    if (enableProfiling) {
      return Sentry.captureException(error, {
        extra: { error, data, message: finalMessage },
      });
    }

    console.log(pc.bgRed(pc.bold('------START ERROR------')));
    console.error(error);
    if (data !== undefined) {
      console.log(pc.yellow(`DATA: ${JSON.stringify(data, null, 2)}`));
    }
    console.log(pc.bgRed(pc.bold('------END ERROR------')));
  },
};

// Add default export for compatibility with default imports
export default Profiling;
