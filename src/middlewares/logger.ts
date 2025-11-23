import { NextFunction, Request, Response } from 'express';
import { logger } from '../services/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.get('X-Request-ID') || 'unknown',
    });
  });

  next();
};

export default requestLogger;
