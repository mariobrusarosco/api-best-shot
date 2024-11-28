import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser: {
        publicId: string
        nickName: string
      }
    }
  }
}
