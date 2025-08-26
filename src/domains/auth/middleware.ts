import { PROFILLING_AUTH } from '@/domains/auth/constants/profiling';
import { Utils } from '@/domains/auth/utils';
import { DB_SelectMember } from '@/domains/member/schema';
import { MemberService } from '@/domains/member/services';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Profiling } from '@/services/profiling';
import { NextFunction, Request, Response } from 'express';

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authCookie = Utils.getUserCookie(req);
    const member = Utils.decodeMemberToken(authCookie) as AuthCookieContent;

    req.authenticatedUser = {
      id: member.id || '',
      nickName: member.nickName,
      role: member.role,
    };

    next();
  } catch (error: unknown) {
    Profiling.error({
      source: PROFILLING_AUTH.AUTH_MIDDLEWARE_ERROR,
      error: error as Error,
    });

    res.status(GlobalErrorMapper.NOT_AUTHORIZED.status).send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);
  }
};

export const AdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the JWT token and decode it (contains only user ID)
    const authCookie = Utils.getUserCookie(req);
    const tokenData = Utils.decodeMemberToken(authCookie) as { id: string };

    // Fetch current user data from database (including role)
    const member = await MemberService.getMemberById(tokenData.id);

    if (!member) {
      return res.status(401).send({ message: 'User not found' });
    }

    req.authenticatedUser = {
      id: tokenData.id,
      nickName: member.nickName,
      role: member.role,
    };

    // Check if user is admin
    if (member.role !== 'admin') {
      return res.status(403).send({ message: 'Admin access required' });
    }

    next();
  } catch (error: unknown) {
    Profiling.error({
      source: PROFILLING_AUTH.AUTH_MIDDLEWARE_ERROR,
      error: error as Error,
    });

    res.status(GlobalErrorMapper.NOT_AUTHORIZED.status).send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);
  }
};

export type AuthCookieContent = DB_SelectMember;
