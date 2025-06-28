import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });
import './services/profiling/sentry-instrument';

import express from 'express';
import logger from './middlewares/logger';
import apiRouter from './router';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import accessControl from './domains/shared/middlewares/access-control';
import { env } from './config/env';

console.log('Starting API Best Shot...');

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

console.log('Registered /health endpoint');

// Root endpoint for testing
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Best Shot Demo - Running on Cloud Run!',
    version: env.API_VERSION || 'v1',
  });
});

console.log('Registered root endpoint');

// JSON Parser Middleware
app.use(express.json());
console.log('Registered JSON parser middleware');

app.set('trust proxy', 1);
app.use(cookieParser());
console.log('Registered cookie parser');

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
console.log('Registered CORS');

app.use(logger);
app.use(accessControl);
console.log('Registered logger and access control');

// Mount the central API router at /api
app.use('/api', apiRouter);
console.log('Registered /api router');

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} in ${env.NODE_ENV} mode`);
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
});

export default app;
