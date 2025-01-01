import Profiling from '@/services/profiling';
import { Response } from 'express';
import { GlobalErrorMapper } from './mapper';

export function handleInternalServerErrorResponse(res: Response, error: any) {
  Profiling.error('[INTERNAL SERVER ERROR] ', error);
  return res
    .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
    .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
}
