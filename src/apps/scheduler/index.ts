import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });

import { env } from '@/config/env';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';

Logger.info('Starting Best Shot Scheduler runtime', {
  environment: env.NODE_ENV,
});

// E0.2 stub: scheduler orchestration is implemented in Phase E.
Logger.info('Scheduler runtime initialized (stub). No recurring jobs are registered yet.', {
  component: 'scheduler',
  operation: 'bootstrap',
});

process.on('uncaughtException', err => {
  Logger.error(err, { domain: DOMAINS.DATA_PROVIDER, component: 'scheduler', operation: 'uncaughtException' });
});

process.on('unhandledRejection', reason => {
  Logger.error(reason instanceof Error ? reason : new Error(String(reason)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'unhandledRejection',
  });
});
