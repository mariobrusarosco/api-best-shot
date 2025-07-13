import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { env } from '../../config/env';

// Initialize Logtail (BetterStack) if token is provided
let logtailTransport: LogtailTransport | null = null;

if (env.LOGTAIL_SOURCE_TOKEN) {
  console.log('🔧 Initializing BetterStack with token:', env.LOGTAIL_SOURCE_TOKEN.substring(0, 8) + '...');
  const logtail = new Logtail(env.LOGTAIL_SOURCE_TOKEN);
  logtailTransport = new LogtailTransport(logtail);
  console.log('✅ BetterStack transport initialized');
} else {
  console.log('⚠️ No LOGTAIL_SOURCE_TOKEN found - BetterStack disabled');
}

// Configure Winston transports
const transports: winston.transport[] = [
  // Console transport for development
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
];

// Add BetterStack transport if available
if (logtailTransport) {
  transports.push(logtailTransport);
}

// Create the logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  // Add metadata for better context
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