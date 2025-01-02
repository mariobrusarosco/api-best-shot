import * as Sentry from '@sentry/node';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo';

const Profiling = {
  error: (msg: string, error: unknown) => {
    if (enableProfiling) {
      return Sentry.captureException(`[${ENV}] - ${msg}`, {
        extra: { error },
      });
    }

    return console.log(`[${ENV}] - ${msg}`);
  },
  log: (msg: string, data?: any) => {
    if (enableProfiling) {
      console.log('profiling log', msg, data);
      return Sentry.captureMessage(`[${ENV}] - ${msg}`, {
        level: 'log',
        extra: { data },
      });
    }

    return console.log(`[${ENV}] - ${msg}`, data);
  },
};

export default Profiling;
