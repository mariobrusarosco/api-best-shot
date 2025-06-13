import * as Sentry from '@sentry/node';
import pc from 'picocolors';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo';

export const Profiling = {
  error: ({ source, error }: { source?: string; error: unknown }) => {
    const finalMessage = `[${ENV}] - [ERROR] - [${source}]`;

    if (enableProfiling) {
      return Sentry.captureException(finalMessage, { extra: { error } });
    }

    console.log(pc.red(pc.bold(finalMessage)), error);
  },
  log: ({ msg, data, source }: { msg: string; data?: any; source?: string }) => {
    if (enableProfiling) {
      return Sentry.captureMessage('[LOG]', {
        level: 'log',
        extra: { data, msg, source },
      });
    }

    console.log('\n');
    console.log(pc.bgWhite(pc.bold('------START LOG------')));
    console.log(pc.magenta(`MSG: ${msg}`));
    console.log(pc.yellow(`DATA: ${JSON.stringify(data, null, 2)}`));
    console.log(pc.bgWhite(pc.bold('------END LOG------')));
    console.log('\n');
  },
};

// Add default export for compatibility with default imports
export default Profiling;
