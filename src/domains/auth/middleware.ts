import { DB_SelectMember } from '@/domains/member/schema';
import { NextFunction, Request, Response } from 'express';
import { GlobalErrorMapper } from '../shared/error-handling/mapper';
import { Utils } from './utils';

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const byPassAuth =
      process.env['NODE_ENV'] === 'demo' || process.env['NODE_ENV'] === 'local-dev';
    const authCookie = Utils.getUserCookie(req);

    console.log(
      { byPassAuth },
      '----authCookie----',
      authCookie,
      '--req.cookies',
      req.cookies,
      '--req.haeder',
      req.headers
    );

    if (byPassAuth) {
      const member = Utils.decodeMemberToken(authCookie) as AuthCookieContent;

      req.authenticatedUser = {
        id: member.id || '',
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
