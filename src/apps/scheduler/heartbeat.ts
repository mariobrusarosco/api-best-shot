import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { HEARTBEAT_INTERVAL_MS } from './config';

export const startHeartbeat = (): NodeJS.Timeout => {
  return setInterval(() => {
    Logger.info('Scheduler heartbeat', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'heartbeat',
      intervalMs: HEARTBEAT_INTERVAL_MS,
    });
  }, HEARTBEAT_INTERVAL_MS);
};
