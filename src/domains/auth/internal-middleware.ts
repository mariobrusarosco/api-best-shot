import { env } from '@/config/env';
import { Profiling } from '@/services/profiling';
import type { NextFunction, Request, Response } from 'express';

export const InternalMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const internalToken = req.headers['x-internal-token'] || req.headers.authorization?.replace('Bearer ', '');

    if (!internalToken) {
      Profiling.error({
        source: 'INTERNAL_MIDDLEWARE_missingToken',
        error: new Error('No internal token provided'),
        data: {
          path: req.path,
          method: req.method,
        },
      });

      return res.status(401).json({
        error: 'Internal service token required',
        message: 'This endpoint requires internal service authentication',
      });
    }

    if (internalToken !== env.INTERNAL_SERVICE_TOKEN) {
      Profiling.error({
        source: 'INTERNAL_MIDDLEWARE_invalidToken',
        error: new Error('Invalid internal token provided'),
        data: {
          path: req.path,
          method: req.method,
          providedToken: typeof internalToken === 'string' ? `${internalToken.substring(0, 8)}...` : 'array_value', // Log only first 8 chars for security
        },
      });

      return res.status(403).json({
        error: 'Invalid internal service token',
        message: 'The provided internal token is not valid',
      });
    }

    Profiling.log({
      msg: 'Internal service authenticated successfully',
      source: 'INTERNAL_MIDDLEWARE_success',
      data: {
        path: req.path,
        method: req.method,
      },
    });

    next();
  } catch (error: unknown) {
    Profiling.error({
      source: 'INTERNAL_MIDDLEWARE_error',
      error,
    });

    return res.status(500).json({
      error: 'Internal authentication failed',
      message: 'An unexpected error occurred during internal authentication',
    });
  }
};
