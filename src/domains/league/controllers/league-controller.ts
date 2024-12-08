import { Utils } from '@/domains/auth/utils';
import { T_League, T_LeagueRole } from '@/domains/league/schema';
import { T_Member } from '@/domains/member/schema';
import { PerformanceController } from '@/domains/performance/controller';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';
import { ErrorMapper } from '../error-handling/mapper';
import { isLeagueParticipant } from '../utils';

const getLeagues = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    console.log(req.authenticatedUser);
    const memberLeages = await db
      .select({
        label: T_League.label,
        description: T_League.description,
        id: T_League.id,
      })
      .from(T_League)
      .innerJoin(T_LeagueRole, eq(T_League.id, T_LeagueRole.leagueId))
      .where(eq(T_LeagueRole.memberId, memberId));

    return res.status(200).send(memberLeages);
  } catch (error: any) {
    console.error('[ERROR] - [get_Leagues] ', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const createLeague = async (req: Request, res: Response) => {
  const memberId = Utils.getAuthenticatedUserId(req, res);
  const { label, description } = req.body;

  try {
    const query = await db
      .insert(T_League)
      .values({
        label,
        description,
        founderId: memberId,
      })
      .returning();

    const league = query.at(0);

    if (!league) {
      return res.status(400).send({ message: 'League not created' });
    }

    await db.insert(T_LeagueRole).values({
      leagueId: league.id,
      memberId,
      role: 'ADMIN',
    });

    return res.status(201).send(league);
  } catch (error: any) {
    console.error('[ERROR] - [createLeague] ', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const inviteToLeague = async (req: Request, res: Response) => {
  try {
    const { leagueId, guestId } = req.body;

    const [isGuestValidMember] = await db
      .select()
      .from(T_Member)
      .where(eq(T_Member.id, guestId));

    if (!isGuestValidMember) {
      res.status(ErrorMapper.NOT_APP_MEMBER.status).send(ErrorMapper.NOT_APP_MEMBER.user);

      return;
    }

    await db
      .insert(T_LeagueRole)
      .values({
        leagueId,
        memberId: guestId,
        role: 'GUEST',
      })
      .returning();

    return res.status(201).send('user invited to league');
  } catch (error: any) {
    console.error('[ERROR] - [inviteToLeague] ', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getLeague = async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;
    const isParticipant = await isLeagueParticipant(req, res, leagueId);

    if (!isParticipant) {
      res
        .status(ErrorMapper.NOT_LEAGUE_MEMBER.status)
        .send(ErrorMapper.NOT_LEAGUE_MEMBER.user);
      return;
    }

    const query = await db
      .select()
      .from(T_LeagueRole)
      .innerJoin(T_League, eq(T_League.id, leagueId))
      .innerJoin(T_Member, eq(T_Member.id, T_LeagueRole.memberId))
      .where(and(eq(T_LeagueRole.leagueId, leagueId)));

    const participants = query.map(row => ({
      role: row.league_role.role,
      nickName: row.member.nickName,
    }));

    const performance = await PerformanceController.getLeaguePerformance(leagueId);

    const league = {
      id: query[0].league.id,
      label: query[0].league.label,
      description: query[0].league.description,
      participants,
      performance,
    };

    res.status(200).send(league);
  } catch (error: any) {
    console.error('[ERROR] - [inviteToLeague] ', error);
    handleInternalServerErrorResponse(res, error);
  }
};

const updateLeaguePerformance = async (req: Request, res: Response) => {
  const { leagueId } = req.params;
  const perf = await PerformanceController.updateLeaguePerformance(leagueId);

  return res.status(200).send(perf);
};

const LeagueController = {
  getLeagues,
  createLeague,
  inviteToLeague,
  getLeague,
  updateLeaguePerformance,
};

export default LeagueController;
