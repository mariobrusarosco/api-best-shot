import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
  isPublic?: boolean;
}

const decodeMemberToken = (token: string) => {
  return jwt.verify(
    token || '',
    '2ab7228845df238a2c01a3364bc079f2e4030421e8ef9baaa5580f52abde2d0f'
  );
};

const getUserCookie = (req: CustomRequest) =>
  req.cookies[process.env['MEMBER_PUBLIC_ID_COOKIE'] || ''] || null;

const signUserCookieBased = ({ memberId, res }: { memberId: string; res: Response }) => {
  try {
    if (!res || !memberId || !process.env['JWT_SECRET']) return null;

    const token = jwt.sign({ id: memberId }, process.env['JWT_SECRET'], {
      expiresIn: '365d',
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
    return req.authenticatedUser?.id;
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
