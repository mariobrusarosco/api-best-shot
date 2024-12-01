import { DB_SelectMember } from '@/domains/member/schema';
import { NextFunction, Request, Response } from 'express';
import { GlobalErrorMapper } from '../shared/error-handling/mapper';
import { Utils } from './utils';

const { NODE_ENV } = process.env;

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const byPassAuth = NODE_ENV === 'demo' || NODE_ENV === 'local-dev';
    const authCookie = Utils.getUserCookie(req);

    console.log('----authCookie----', authCookie);

    if (byPassAuth) {
      const member = Utils.decodeMemberToken(authCookie) as AuthCookieContent;

      req.authenticatedUser = {
        publicId: member.publicId || '',
        nickName: member.nickName,
      };
    }

    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]', error);
    res
      .status(GlobalErrorMapper.NOT_AUTHORIZED.status)
      .send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);
  }
};

export type AuthCookieContent = DB_SelectMember;
