import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { Response } from 'express';
import { GlobalErrorMapper } from './mapper';

export function handleInternalServerErrorResponse(res: Response, error: unknown) {
  // Log to both Sentry and console for debugging
  console.error('🚨 Internal Server Error:', error);

  Logger.error(error as Error, {
    domain: DOMAINS.DASHBOARD,
    component: 'api',
    operation: 'handleInternalServerErrorResponse',
  });

  return res.status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status).send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
}
