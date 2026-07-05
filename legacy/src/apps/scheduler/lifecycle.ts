import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';

export const registerShutdownHandlers = (shutdown: (signal: NodeJS.Signals) => void): void => {
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

export const registerProcessErrorHandlers = (): void => {
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
};
