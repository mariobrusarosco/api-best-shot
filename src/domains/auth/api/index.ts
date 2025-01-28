import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Request, Response } from 'express';
import { Utils } from '../utils';
import { T_Member } from '@/domains/member/schema';
import { eq } from 'drizzle-orm';
import db from '@/services/database';
import { AuthenticateMemberRequest } from '../typing';

const authenticateUser = async (req: AuthenticateMemberRequest, res: Response) => {
  try {
    console.log('Authentication attempt with payload:', req.body);
    
    const publicId = req.body.publicId;
    if (!publicId) {
      console.error('Missing publicId in request body');
      return res.status(400).json({ error: 'Missing publicId in request' });
    }

    console.log('Searching for member with publicId:', publicId);
    const [member] = await db
      .select()
      .from(T_Member)
      .where(eq(T_Member.publicId, publicId));

    if (!member) {
      console.error('No member found with publicId:', publicId);
      return res.status(404).json({ error: 'No user found to authenticate' });
    }

    console.log('Member found:', { id: member.id, publicId: member.publicId });
    const token = Utils.signUserCookieBased({ memberId: member.id, res });
    return res.status(200).json({ token });
  } catch (error: any) {
    console.error('[AUTH - POST] Authentication error:', error);
    console.error('Stack trace:', error.stack);
    handleInternalServerErrorResponse(res, error);
  }
};

const unauthenticateUser = async (req: Request, res: Response) => {
  try {
    Utils.clearUserCookie(res);

    return res.status(200).send('User unauthenticated');
  } catch (error: any) {
    console.error(`[AUTH - DELETE] ${error}`);
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_AUTH = {
  authenticateUser,
  unauthenticateUser,
};
