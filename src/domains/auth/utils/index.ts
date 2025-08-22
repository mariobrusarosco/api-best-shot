import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Profiling } from '@/services/profiling';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PROFILLING_AUTH } from '../constants/profiling';

interface CustomRequest extends Request {
  isPublic?: boolean;
}

const decodeMemberToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      Profiling.error({
        source: PROFILLING_AUTH.EXPIRED_TOKEN,
        error,
      });
      throw new Error('Token expired');
    }

    Profiling.error({
      source: PROFILLING_AUTH.INVALID_TOKEN,
      error,
    });
    throw new Error('Invalid token');
  }
};

const getUserCookie = (req: CustomRequest) => {
  const cookie = req.cookies[process.env.MEMBER_PUBLIC_ID_COOKIE!];

  if (!cookie) {
    Profiling.error({
      source: PROFILLING_AUTH.INVALID_TOKEN,
      error: 'No auth cookie found',
    });
    throw new Error('Not authenticated');
  }

  return cookie;
};

const signUserCookieBased = ({ memberId, res }: { memberId: string; res: Response }) => {
  try {
    if (!res || !memberId || !process.env['JWT_SECRET']) return null;

    const token = jwt.sign({ id: memberId }, process.env['JWT_SECRET'], {
      expiresIn: '180d',
    });

    res.clearCookie(process.env['MEMBER_PUBLIC_ID_COOKIE'] || '');
    res.cookie(process.env['MEMBER_PUBLIC_ID_COOKIE'] || '', token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env['NODE_ENV'] !== 'local-dev' ? 'none' : 'lax',
    });

    return token;
  } catch (e) {
    console.log('[AUTH] - sign user via cookie based failed', e);
  }
};

const getAuthenticatedUserId = (req: Request, res: Response) => {
  try {
    if (!req.authenticatedUser) throw new Error('User not authenticated');

    return req.authenticatedUser?.id;
  } catch (e) {
    res.status(GlobalErrorMapper.NOT_AUTHORIZED.status).send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);

    throw e;
  }
};

const clearUserCookie = (res: Response) => {
  res.clearCookie(process.env['MEMBER_PUBLIC_ID_COOKIE'] || '');
};

const getAuthenticatedUserRole = (req: Request) => {
  if (!req.authenticatedUser) throw new Error('User not authenticated');
  return req.authenticatedUser.role;
};

const isUserAdmin = (req: Request): boolean => {
  try {
    const role = getAuthenticatedUserRole(req);
    return role === 'admin';
  } catch {
    return false;
  }
};

const requireAdmin = (req: Request, res: Response) => {
  if (!isUserAdmin(req)) {
    res.status(403).send({ message: 'Admin access required' });
    throw new Error('Admin access required');
  }
};

export const Utils = {
  clearUserCookie,
  getUserCookie,
  signUserCookieBased,
  decodeMemberToken,
  getAuthenticatedUserId,
  getAuthenticatedUserRole,
  isUserAdmin,
  requireAdmin,
  createTokenResponse: (userId: string, nickName: string, email: string) => {
    try {
      const token = jwt.sign({ id: userId, nickName, email }, process.env.JWT_SECRET!, {
        expiresIn: '30d',
      });

      // Log successful token creation
      Profiling.log({
        msg: PROFILLING_AUTH.TOKEN_REFRESHED,
        data: { userId },
        source: 'AUTH_UTILS_createTokenResponse',
      });

      return token;
    } catch (error) {
      Profiling.error({
        source: PROFILLING_AUTH.CREATE_TOKEN,
        error,
      });
      throw error;
    }
  },
};
