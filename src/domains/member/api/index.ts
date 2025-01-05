import { Utils } from '@/domains/auth/utils';
import { DB_Performance } from '@/domains/performance/database';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { MemberController } from '../controllers/member-controller';
import { T_Member } from '../schema';
import { CreateMemberRequest } from './typing';

const getMember = async (req: Request, res: Response) => {
  const memberId = Utils.getAuthenticatedUserId(req, res);

  try {
    const [member] = await db
      .select({ nickName: T_Member.nickName, email: T_Member.email, id: T_Member.id })
      .from(T_Member)
      .where(eq(T_Member.id, memberId));

    res.status(200).send(member);
    return;
  } catch (error: any) {
    console.error('[ERROR] [getMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const createMember = async (req: CreateMemberRequest, res: Response) => {
  try {
    const body = req.body;
    const newMember = await MemberController.createMember(body);

    if (newMember === null) return null;

    Utils.signUserCookieBased({ memberId: newMember.id, res });

    res.status(200).send(newMember);
    return;
  } catch (error: any) {
    console.error('[ERROR] [createMember]', error);
    handleInternalServerErrorResponse(res, error);
    return;
  }
};

const getGeneralTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    console.log('getGeneralTournamentPerformance API', memberId);

    const memberTournaments = await DB_Performance.queryPerformanceOfAllMemberTournaments(
      memberId
    );

    res.status(200).send(memberTournaments);
    return;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    handleInternalServerErrorResponse(res, error);
    return;
  }
};

export const API_Member = {
  getGeneralTournamentPerformance,
  getMember,
  createMember,
};
