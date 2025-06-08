import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });
// Disclaimer: Following Sentry DOCs, the above code should be placed in the main file before importing "Express" :https://docs.sentry.io/platforms/javascript/guides/express/
import * as Sentry from '@sentry/node';
import './services/profiling/sentry-instrument';

import express from 'express';
import logger from './middlewares/logger';
import ApplicationRouter from './router';
const cookieParser = require('cookie-parser');
const cors = require('cors');

import accessControl from './domains/shared/middlewares/access-control';
import { env } from './config/env';

const app = express();
const port = env.PORT;

// JSON Parser Middleware
app.use(express.json());

app.set('trust proxy', 1);
app.use(cookieParser() as any);

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));

app.use(logger);
app.use(accessControl);

async function startServer() {
  // Initialize router with auto-loading of routes
  await ApplicationRouter.init(app);

  app.listen(port, () => {
    console.log(`Server running on port ${port} in ${env.NODE_ENV} mode`);
  });
}

startServer();

export default app;
