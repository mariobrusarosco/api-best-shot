import { Response } from 'express'
import { GlobalErrorMapper } from './mapper'

export function handleInternalServerErrorResponse(res: Response, error: any) {
  // TODO log the error param somewhere
  return res
    .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
    .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
}
