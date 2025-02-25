import { DB_SelectMember } from '@/domains/member/schema';
import Profiling from '@/services/profiling';
import { NextFunction, Request, Response } from 'express';
import { GlobalErrorMapper } from '../shared/error-handling/mapper';
import { Utils } from './utils';

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authCookie = Utils.getUserCookie(req);
    const member = Utils.decodeMemberToken(authCookie) as AuthCookieContent;

    req.authenticatedUser = {
      id: member.id || '',
      nickName: member.nickName,
    };

    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]', error);
    Profiling.error('[AUTH MIDDLEWARE ERROR]', error);

    res
      .status(GlobalErrorMapper.NOT_AUTHORIZED.status)
      .send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);
  }
};

export type AuthCookieContent = DB_SelectMember;
