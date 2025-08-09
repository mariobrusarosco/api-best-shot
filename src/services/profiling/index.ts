import * as Sentry from '@sentry/node';
import pc from 'picocolors';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo';

export const Profiling = {
  error: ({
    source,
    error,
    data,
  }: {
    source?: string;
    error: unknown;
    data?: unknown;
  }) => {
    const finalMessage = `[${ENV}] - [ERROR] - [${source}]`;

    if (enableProfiling) {
      return Sentry.captureException(finalMessage, { extra: { error, data } });
    }

    console.log(pc.bgRed(pc.bold('------START ERROR------')));
    console.error(error);
    source && console.log(pc.red(pc.bold(`SOURCE: ${source}`)));
    if (data !== undefined) {
      console.log(pc.yellow(`DATA: ${JSON.stringify(data, null, 2)}`));
    }
    console.log(pc.bgRed(pc.bold('------END ERROR------')));
  },
  log: ({ msg, data, source }: { msg: string; data?: unknown; source?: string }) => {
    if (enableProfiling) {
      return Sentry.captureMessage(msg, {
        level: 'log',
        extra: { data, source },
      });
    }

    console.log('\n');
    console.log(pc.bgWhite(pc.bold('------START LOG------')));
    msg && console.log(pc.magenta(`MSG: ${msg}`));
    data && console.log(pc.yellow(`DATA: ${JSON.stringify(data, null, 2)}`));
    source && console.log(pc.green(`SOURCE: ${source}`));
    console.log(pc.bgWhite(pc.bold('------END LOG------')));
    console.log('\n');
  },
};

// Add default export for compatibility with default imports
export default Profiling;
