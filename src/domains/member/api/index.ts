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

    return res.status(200).send(member);
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

    return res.status(200).send(newMember);
  } catch (error: any) {
    console.error('[ERROR] [createMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getGeneralTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    console.log('getGeneralTournamentPerformance API', memberId);

    const memberTournaments = await DB_Performance.queryPerformanceOfAllMemberTournaments(
      memberId
    );
    // const query = await DB_Performance.queryTournamentPerformance(memberId, tournamentId);

    return res.status(200).send(memberTournaments);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_Member = {
  getGeneralTournamentPerformance,
  getMember,
  createMember,
};
