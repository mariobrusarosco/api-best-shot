import winston from 'winston';
import { env } from '../../config/env';

// Console format for all environments (Human Readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Filter out default meta fields to keep logs clean
    const metaStr = Object.keys(meta).filter(key => !['service', 'environment', 'version'].includes(key)).length
      ? JSON.stringify(meta, null, 2)
      : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create the logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: consoleFormat, // Use human-readable format everywhere
  transports: [new winston.transports.Console()],
  defaultMeta: {
    service: 'api-best-shot',
    environment: env.NODE_ENV,
    version: env.API_VERSION || 'unknown',
  },
});

// Export convenience methods
export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: object) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...meta,
  });
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

export default logger;
