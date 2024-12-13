import { Utils } from '@/domains/auth/utils';
import { T_Member } from '@/domains/member/schema';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';

async function authenticateUser(req: Request, res: Response) {
  try {
    const body = req?.body as { publicId: string };
    const publicId = body.publicId;

    const [member] = await db
      .select()
      .from(T_Member)
      .where(eq(T_Member.publicId, publicId));

    if (!member) throw new Error('no user found to authenticate');

    const token = Utils.signUserCookieBased({ memberId: member.id, res });

    return res.status(200).send(token);
  } catch (error: any) {
    console.error(`[AUTH - POST] ${error}`);

    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
}

const AuthController = {
  authenticateUser,
};

export default AuthController;
