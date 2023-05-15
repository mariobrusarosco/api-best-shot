import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
// import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'

async function start(req: Request, res: Response) {
  const body = req?.body

  try {
    console.log({ body })

    return res.status(200).send('start')
  } catch (error) {
    console.error(error)
    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

const AuthController = {
  start
}

export default AuthController
