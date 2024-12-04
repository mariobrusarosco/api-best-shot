import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
  isPublic?: boolean;
}

const decodeMemberToken = (token: string) => {
  return jwt.verify(token || '', process.env['JWT_SECRET'] || '');
};

const getUserCookie = (req: CustomRequest) =>
  req.cookies[process.env['MEMBER_PUBLIC_ID_COOKIE'] || ''] || null;

const signUserCookieBased = (publicId: string, res: Response) => {
  try {
    if (!res || !publicId || !process.env['JWT_SECRET']) return null;

    const token = jwt.sign({ publicId }, process.env['JWT_SECRET'], {
      expiresIn: '3d',
    });

    console.log(
      '--  [][][] JWT_SECRET ========',
      process.env['JWT_SECRET'],
      process.env['MEMBER_PUBLIC_ID_COOKIE'],
      token
    );
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
    return req.authenticatedUser?.publicId;
  } catch (e) {
    res
      .status(GlobalErrorMapper.NOT_AUTHORIZED.status)
      .send(GlobalErrorMapper.NOT_AUTHORIZED.userMessage);

    throw e;
  }
};

const clearUserCookie = (res: Response) => {
  res.clearCookie(process.env['MEMBER_PUBLIC_ID_COOKIE'] || '');
};

export const Utils = {
  clearUserCookie,
  getUserCookie,
  signUserCookieBased,
  decodeMemberToken,
  getAuthenticatedUserId,
};
