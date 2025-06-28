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

const app = express();
const port = env.PORT;

// Simple health check endpoint - add this BEFORE complex initialization
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    port: port,
  });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Best Shot Demo - Running on Cloud Run!',
    version: env.API_VERSION || 'v1',
  });
});

// JSON Parser Middleware
app.use(express.json());

app.set('trust proxy', 1);
app.use(cookieParser());

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));

app.use(logger);
app.use(accessControl);

// Mount the central API router at /api
app.use('/api', apiRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} in ${env.NODE_ENV} mode`);
});

export default app;
