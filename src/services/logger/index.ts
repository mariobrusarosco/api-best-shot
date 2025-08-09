import winston from 'winston';
import { env } from '../../config/env';

// Google Cloud Logging optimized format
const googleCloudFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(info => {
    // Structure logs for optimal Google Cloud Logging experience
    const { level, service, environment, version, timestamp, message, ...rest } = info;
    const log = {
      timestamp,
      severity: level.toUpperCase(),
      message,
      service,
      environment,
      version,
      ...rest,
    };

    return JSON.stringify(log);
  })
);

// Console format for local development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).filter(
      key => !['service', 'environment', 'version'].includes(key)
    ).length
      ? JSON.stringify(meta, null, 2)
      : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create the logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'development' ? consoleFormat : googleCloudFormat,
  transports: [new winston.transports.Console()],
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
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...meta,
  });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export default logger;
