import * as Sentry from '@sentry/node';

const ENV = process.env.NODE_ENV;
const enableProfiling = ENV === 'production' || ENV === 'demo';

const Profiling = {
  error: (msg: string, error: unknown) => {
    const finalMessage = `[${ENV}] - [ERROR] - ${msg}`;

    if (enableProfiling) {
      return Sentry.captureException(finalMessage, { extra: { error } });
    }

    console.error(finalMessage, error);
  },
  log: (msg: string, data?: any) => {
    const finalMessage = `[${ENV}] - [LOG] - ${msg}`;

    if (enableProfiling) {
      return Sentry.captureMessage(finalMessage, {
        level: 'log',
        extra: { data },
      });
    }

    console.log(finalMessage, data);
  },
};

export default Profiling;
