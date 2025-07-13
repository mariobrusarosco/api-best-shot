import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });
import './services/profiling/sentry-instrument';

import express from 'express';
import requestLogger from './middlewares/logger';
import apiRouter from './router';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import accessControl from './domains/shared/middlewares/access-control';
import { env } from './config/env';
import { logger, logInfo, logError } from './services/logger';

logInfo('Starting API Best Shot...', { 
  environment: env.NODE_ENV,
  port: env.PORT,
  version: env.API_VERSION 
});

const app = express();
const port = Number(process.env.PORT || env.PORT || 8080);

// Simple health check endpoint - add this BEFORE complex initialization
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    port: port,
  });
});

logInfo('Registered /health endpoint');

// Root endpoint for testing
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Best Shot Demo - Running on Cloud Run!',
    version: env.API_VERSION || 'v1',
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
  logInfo(`Server running on port ${port} in ${env.NODE_ENV} mode`, { port, environment: env.NODE_ENV });
});

process.on('uncaughtException', err => {
  logError('Uncaught Exception', err);
});
process.on('unhandledRejection', reason => {
  logError('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

export default app;
