import Logger from '@/core/logger';
import { HEARTBEAT_INTERVAL_MS } from './config';

export const startHeartbeat = (): NodeJS.Timeout => {
  return setInterval(() => {
    Logger.info(`Scheduler heartbeat intervalMs=${HEARTBEAT_INTERVAL_MS}`);
  }, HEARTBEAT_INTERVAL_MS);
};
