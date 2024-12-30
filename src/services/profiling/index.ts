import * as Sentry from '@sentry/node';

const isProd = process.env.NODE_ENV === 'production' || 'local-dev';

const Profiling = {
  error: (msg: string, error: unknown) => {
    console.error('[ERROR]', msg, error);
    if (isProd) {
      Sentry.captureMessage(msg, {
        extra: { error },
      });
    }
  },
  // middleware: (req: Request, res: Response, next: NextFunction) => {
  //   console.log('[LOGGER] - ROUTE', req.method, req.url);
  //   console.log('[LOGGER] - COOKIES', JSON.stringify(req.cookies));
  //   next();
  // },
  log: (msg: string, data?: any) => console.log({ isProd }, '[LOG]', msg, data),
};

export default Profiling;
