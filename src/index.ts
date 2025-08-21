import { config } from 'dotenv';
import './services/profiling/sentry-instrument';
config({ path: process.env.ENV_PATH || '.env' });

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import requestLogger from './middlewares/logger';
import apiRouter from './router';

import { env } from './config/env';
import accessControl from './domains/shared/middlewares/access-control';
import { logError, logInfo } from './services/logger';

logInfo('Starting API Best Shot...', {
  environment: env.NODE_ENV,
  port: env.PORT,
  version: env.API_VERSION,
});

const app = express();
const port = Number(process.env.PORT || env.PORT || 8080);

// Simple health check endpoint - add this BEFORE complex initialization
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    port: port,
  });
});

logInfo('Registered /health endpoint');

// Root endpoint for testing
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'API Best Shot Demo - Running on Cloud Run!',
    version: env.API_VERSION || 'v1',
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
    HAS_INTERNAL_SERVICE_TOKEN: !!env.INTERNAL_SERVICE_TOKEN,
    HAS_CORS_ORIGIN: !!process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    HAS_COOKIE_NAME: !!process.env.MEMBER_PUBLIC_ID_COOKIE,
    SENTRY_DSN_PREFIX: `${process.env.SENTRY_DSN?.substring(0, 20)}...` || 'NOT_SET',
    AWS_CLOUDFRONT_PREFIX:
      `${process.env.AWS_CLOUDFRONT_URL?.substring(0, 20)}...` || 'NOT_SET',
  };

  res.status(200).json({
    message: 'Environment Check - Remove this endpoint in production!',
    secrets: envCheck,
    timestamp: new Date().toISOString(),
  });
});

logInfo('Registered root endpoint');

// JSON Parser Middleware
app.use(express.json());
logInfo('Registered JSON parser middleware');

app.set('trust proxy', 1);
app.use(cookieParser());
logInfo('Registered cookie parser');

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
logInfo('Registered CORS');

app.use(requestLogger);
app.use(accessControl);
logInfo('Registered logger and access control');

// Mount the central API router at /api
app.use('/api', apiRouter);
logInfo('Registered /api router');

app.listen(port, '0.0.0.0', () => {
  logInfo(`Server running on port ${port} in ${env.NODE_ENV} mode`, {
    port,
    environment: env.NODE_ENV,
  });
});

process.on('uncaughtException', err => {
  logError('Uncaught Exception', err);
});
process.on('unhandledRejection', reason => {
  logError(
    'Unhandled Rejection',
    reason instanceof Error ? reason : new Error(String(reason))
  );
});

export default app;
