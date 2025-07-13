import winston from 'winston';
import { env } from '../../config/env';

// Simple HTTP transport for BetterStack
const betterStackTransport = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf((info) => {
    if (env.LOGTAIL_SOURCE_TOKEN) {
      // Send to BetterStack via HTTP
      fetch('https://in.logs.betterstack.com/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LOGTAIL_SOURCE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dt: info.timestamp,
          ...info,
        }),
      }).catch(() => {}); // Silent fail
    }
    return JSON.stringify(info);
  })
);

// Create the logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: betterStackTransport,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
  defaultMeta: {
    service: 'api-best-shot',
    environment: env.NODE_ENV,
    version: env.API_VERSION || 'unknown',
  },
});

// Export convenience methods
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, { error: error?.stack || error, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export default logger;