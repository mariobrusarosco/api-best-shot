import { Utils } from '@/domains/auth/utils';
import { T_Member } from '@/domains/member/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { CreateMemberInput } from '../api/typing';

const getMember = async (req: Request, res: Response) => {
  const memberId = Utils.getAuthenticatedUserId(req, res);

  try {
    const [member] = await db
      .select({ nickName: T_Member.nickName })
      .from(T_Member)
      .where(eq(T_Member.id, memberId));

    return res.status(200).send(member);
  } catch (error: unknown) {
    console.error('[ERROR] [getMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const createMember = async (input: CreateMemberInput) => {
  try {
    const [member] = await db.insert(T_Member).values(input).returning();

    return member;
  } catch (error: unknown) {
    console.error('[ERROR] [Controller] createMember', error);
    return null;
  }
};

export const MemberController = {
  getMember,
  createMember,
};
