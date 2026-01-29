import { NextFunction, Request, Response } from 'express';
import Logger from '../services/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const context = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.get('X-Request-ID') || 'unknown',
    };

    if (res.statusCode >= 400) {
      Logger.warn('Request completed', context);
    } else {
      Logger.info('Request completed', context);
    }
  });

  next();
};

export default requestLogger;
