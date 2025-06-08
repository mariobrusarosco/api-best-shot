import * as Sentry from '@sentry/node';
import pc from 'picocolors';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo';

export const Profiling = {
  error: ({ source, error }: { source: string; error: unknown }) => {
    const finalMessage = `[${ENV}] - [ERROR] - [${source}] - ${error}`;

    if (enableProfiling) {
      return Sentry.captureException(finalMessage, { extra: { error } });
    }

    console.log(pc.red(pc.bold(finalMessage)));
  },
  log: ({ msg, data, source }: { msg: string; data?: any; source: string }) => {
    const finalMessage = `[${ENV}] - [LOG] - [${source}] - ${msg}`;

    if (enableProfiling) {
      return Sentry.captureMessage(finalMessage, {
        level: 'log',
        extra: { data },
      });
    }

    console.log(pc.green(finalMessage), data);
  },
};

// Add default export for compatibility with default imports
export default Profiling;

const ConsoleColors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',
  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
};
