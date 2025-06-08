import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser: {
        id: string;
        nickName: string;
      };
    }
  }
}
