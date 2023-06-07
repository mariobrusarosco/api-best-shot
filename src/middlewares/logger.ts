import { NextFunction, Request, Response } from 'express'

const logger = (req: Request, res: Response, next: NextFunction) => {
  console.log('[logger]', req.url)
  console.log('[cookies]', req.cookies)
  next()
}

export default logger
