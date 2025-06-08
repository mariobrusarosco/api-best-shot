import Profiling from '@/services/profiling';
import { Response } from 'express';
import { GlobalErrorMapper } from './mapper';

export function handleInternalServerErrorResponse(res: Response, error: any) {
  Profiling.error({
    source: 'HTTP_RESPONSES_HELPER_internalServerError',
    error,
  });
  return res
    .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
    .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
}
