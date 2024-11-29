import { Response } from 'express';
import { GlobalErrorMapper } from './mapper';

export function handleInternalServerErrorResponse(res: Response, error: any) {
  // TODO log the error param somewhere
  console.error({ error });
  return res
    .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
    .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
}
