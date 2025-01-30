import { Utils } from '@/domains/auth/utils';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { MemberController } from '../controllers/member-controller';
import { T_Member } from '../schema';
import { CreateMemberRequest } from './typing';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';
import { QUERIES_PERFORMANCE } from '@/domains/performance/queries';

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

    const memberTournaments = await QUERIES_PERFORMANCE.queryPerformanceOfAllMemberTournaments(
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


const getMemberPerformanceForAllTournaments = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const bestAndWorstPerformance = await SERVICES_PERFORMANCE_V2.tournament.getMemberBestAndWorstPerformance(memberId);

    res.status(200).send(bestAndWorstPerformance);
    return;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    handleInternalServerErrorResponse(res, error);
    return;
  }
};
export const API_MEMBER = {
  getGeneralTournamentPerformance,
  getMember,
  createMember,
  getMemberPerformanceForAllTournaments,
};
