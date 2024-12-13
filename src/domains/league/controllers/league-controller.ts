import { Utils } from '@/domains/auth/utils';
import { T_League, T_LeagueRole, T_LeagueTournament } from '@/domains/league/schema';
import { T_Member } from '@/domains/member/schema';
import { T_LeaguePerformance } from '@/domains/performance/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq, sql } from 'drizzle-orm';
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
    await db.insert(T_LeaguePerformance).values({
      leagueId: league.id,
      memberId,
      points: String(0),
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

    await db.insert(T_LeaguePerformance).values({
      leagueId,
      memberId: guestId,
      points: String(0),
    });

    return res.status(201).send('user invited to league');
  } catch (error: any) {
    console.error('[ERROR] - [inviteToLeague] ', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getLeague = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { leagueId } = req.params;
    const isParticipant = await isLeagueParticipant(req, res, leagueId);

    if (!isParticipant) {
      res
        .status(ErrorMapper.NOT_LEAGUE_MEMBER.status)
        .send(ErrorMapper.NOT_LEAGUE_MEMBER.user);
      return;
    }

    const mainQuery = await db
      .select()
      .from(T_LeagueRole)
      .innerJoin(T_League, eq(T_League.id, leagueId))
      .innerJoin(T_Member, eq(T_Member.id, T_LeagueRole.memberId))
      .where(and(eq(T_LeagueRole.leagueId, leagueId)));

    const participants = mainQuery.map(row => ({
      role: row.league_role.role,
      nickName: row.member.nickName,
    }));

    const memberRole = mainQuery.find(row => row.league_role.memberId === memberId);
    const permissions = {
      edit: memberRole?.league_role.role === 'ADMIN',
      invite: memberRole?.league_role.role === 'ADMIN',
      delete: memberRole?.league_role.role === 'ADMIN',
    };

    const tournamentsQuery = await db
      .select()
      .from(T_LeagueTournament)
      .leftJoin(T_Tournament, eq(T_LeagueTournament.tournamentId, T_Tournament.id))
      .where(
        and(
          eq(T_LeagueTournament.leagueId, leagueId),
          eq(T_LeagueTournament.status, 'tracked')
        )
      );

    const tournaments = tournamentsQuery.map(row => row.tournament);

    const leagueWithParticipantsAndTournaments = {
      id: mainQuery[0].league.id,
      label: mainQuery[0].league.label,
      description: mainQuery[0].league.description,
      permissions,
      participants,
      tournaments,
    };

    res.status(200).send(leagueWithParticipantsAndTournaments);
  } catch (error: any) {
    console.error('[ERROR] - [getLeague] ', error);
    handleInternalServerErrorResponse(res, error);
  }
};

const updateLeagueTournaments = async (req: Request, res: Response) => {
  const { updateInput } = req.body;

  const query = await db
    .insert(T_LeagueTournament)
    .values(updateInput)
    .onConflictDoUpdate({
      target: [T_LeagueTournament.leagueId, T_LeagueTournament.tournamentId],
      set: {
        status: sql`excluded.status`,
      },
    })
    .returning();

  return res.status(200).send(query);
};

const LeagueController = {
  getLeagues,
  createLeague,
  inviteToLeague,
  getLeague,
  updateLeagueTournaments,
};

export default LeagueController;
