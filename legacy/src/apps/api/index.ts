import { config } from 'dotenv';

config({ path: process.env.ENV_PATH || '.env' });

import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import accessControl from '@/domains/shared/middlewares/access-control';
import requestLogger from '@/middlewares/logger';
import apiRouter from '@/router';

const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || '/v2';
const PORT = Number(process.env.PORT || '9090');
const ACCESS_CONTROL_ALLOW_ORIGIN = process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '*';

Logger.info('Starting API Best Shot...', {
  environment: NODE_ENV,
  port: PORT,
  version: API_VERSION,
  CORS: ACCESS_CONTROL_ALLOW_ORIGIN,
});

const app = express();
const port = PORT;

// Simple health check endpoint - add this BEFORE complex initialization
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: port,
  });
});

Logger.info('/health endpoint: ✅');

// Root endpoint for testing
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'API Best Shot Demo - Hello World!',
    version: API_VERSION || 'v1',
  });
});

// Debug endpoint to check environment variables (REMOVE IN PRODUCTION)
app.get('/debug/env', (_req, res) => {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    HAS_SENTRY_DSN: !!process.env.SENTRY_DSN,
    HAS_AWS_ACCESS_KEY: !!process.env.AWS_ACCESS_KEY_ID,
    HAS_AWS_SECRET_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    HAS_AWS_BUCKET: !!process.env.AWS_BUCKET_NAME,
    HAS_AWS_CLOUDFRONT: !!process.env.AWS_CLOUDFRONT_URL,
    HAS_INTERNAL_SERVICE_TOKEN: !!process.env.INTERNAL_SERVICE_TOKEN,
    HAS_CORS_ORIGIN: !!process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    HAS_COOKIE_NAME: !!process.env.MEMBER_PUBLIC_ID_COOKIE,
    SENTRY_DSN_PREFIX: `${process.env.SENTRY_DSN?.substring(0, 20)}...` || 'NOT_SET',
    AWS_CLOUDFRONT_PREFIX: `${process.env.AWS_CLOUDFRONT_URL?.substring(0, 20)}...` || 'NOT_SET',
  };

  res.status(200).json({
    message: 'Environment Check - Remove this endpoint in production!',
    secrets: envCheck,
  });
});

// JSON Parser Middleware
app.use(express.json());
Logger.info('[JSON parser] middleware: ✅');

app.set('trust proxy', 1);
app.use(cookieParser());
Logger.info('[Cookie Parser] middleware: ✅');

const corsConfig = {
  origin: ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
Logger.info('[CORS] middleware: ✅');

app.use(requestLogger);
app.use(accessControl);
Logger.info('[Logger and access control] middleware: ✅');

// Mount the central API router at /api
app.use('/api', apiRouter);
Logger.info('[API router] mounted: ✅');

app.listen(port, '0.0.0.0', () => {
  Logger.info(`Server running on port ${port} in ${NODE_ENV} mode`, {
    port,
    environment: NODE_ENV,
  });
});

process.on('uncaughtException', err => {
  Logger.error(err, { domain: DOMAINS.DATA_PROVIDER, component: 'process', operation: 'uncaughtException' });
});
process.on('unhandledRejection', reason => {
  Logger.error(reason instanceof Error ? reason : new Error(String(reason)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'process',
    operation: 'unhandledRejection',
  });
});

export default app;
