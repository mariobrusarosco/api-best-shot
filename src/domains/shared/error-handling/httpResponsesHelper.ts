import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { Response } from 'express';
import { GlobalErrorMapper } from './mapper';

export function handleInternalServerErrorResponse(res: Response, error: unknown) {
  Logger.error(error as Error, {
    domain: DOMAINS.DASHBOARD,
    component: 'api',
    operation: 'handleInternalServerErrorResponse',
  });

  return res.status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status).send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
}
