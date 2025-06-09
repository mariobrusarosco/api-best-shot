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
