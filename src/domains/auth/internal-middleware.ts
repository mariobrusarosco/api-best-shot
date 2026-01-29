import { env } from '@/config/env';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import type { NextFunction, Request, Response } from 'express';

export const InternalMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const internalToken = req.headers['x-internal-token'] || req.headers.authorization?.replace('Bearer ', '');

    if (!internalToken) {
      Logger.error(new Error('No internal token provided'), {
        domain: DOMAINS.AUTH,
        component: 'middleware',
        operation: 'InternalMiddleware',
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        error: 'Internal service token required',
        message: 'This endpoint requires internal service authentication',
      });
    }

    if (internalToken !== env.INTERNAL_SERVICE_TOKEN) {
      Logger.error(new Error('Invalid internal token provided'), {
        domain: DOMAINS.AUTH,
        component: 'middleware',
        operation: 'InternalMiddleware',
        path: req.path,
        method: req.method,
        providedToken: typeof internalToken === 'string' ? `${internalToken.substring(0, 8)}...` : 'array_value',
      });

      return res.status(403).json({
        error: 'Invalid internal service token',
        message: 'The provided internal token is not valid',
      });
    }

    Logger.info('Internal service authenticated successfully', {
      domain: DOMAINS.AUTH,
      component: 'middleware',
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.AUTH,
      component: 'middleware',
      operation: 'InternalMiddleware',
    });

    return res.status(500).json({
      error: 'Internal authentication failed',
      message: 'An unexpected error occurred during internal authentication',
    });
  }
};
