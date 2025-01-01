import { NextFunction, Request, Response } from 'express';

const logger = (req: Request, _: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[logger]', req.url);
    console.log('[method]', req.method);
  }

  next();
};

export default logger;
