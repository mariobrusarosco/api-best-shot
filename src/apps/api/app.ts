import cors from 'cors';
import express from 'express';
import { env } from '@/config/env';
import apiRouter from '@/router';

export const createApiApp = (): express.Express => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({
      name: 'football-platform-api',
      status: 'ok',
    });
  });

  app.use('/api', apiRouter);

  return app;
};
