import { Utils } from '@/domains/auth/utils';
import { T_League } from '@/domains/league/schema';
import { T_Member } from '@/domains/member/schema';
import { updateAllLeaguesForMember } from '@/domains/performance/controller';
import {
  DB_SelectLeaguePerformance,
  DB_SelectTournamentPerformance,
  T_LeaguePerformance,
  T_TournamentPerformance,
} from '@/domains/performance/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { DB_SelectTournament, T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { desc, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

const getMember = async (req: Request, res: Response) => {
  const memberId = Utils.getAuthenticatedUserId(req, res);

  try {
    const [member] = await db
      .select({ nickName: T_Member.nickName })
      .from(T_Member)
      .where(eq(T_Member.id, memberId));

    return res.status(200).send(member);
  } catch (error: any) {
    console.error('[ERROR] [getMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getMemberPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);

    await updateAllLeaguesForMember(memberId);
    // TODO Consider using the above function's return instead of
    // calling the Select query

    const tournamentsPerformance = await db
      .select({
        tourmamentId: T_Tournament.id,
        points: T_TournamentPerformance.points,
        name: T_Tournament.label,
        badge: T_Tournament.logo,
      })
      .from(T_TournamentPerformance)
      .leftJoin(T_Tournament, eq(T_Tournament.id, T_TournamentPerformance.tournamentId))
      .where(eq(T_TournamentPerformance.memberId, memberId))
      .orderBy(desc(T_TournamentPerformance.points));

    const mainLeague = await db
      .selectDistinct({
        leagueId: T_League.id,
        points: T_LeaguePerformance.points,
        name: T_League.label,
      })
      .from(T_LeaguePerformance)
      .innerJoin(T_League, eq(T_League.id, T_LeaguePerformance.leagueId))
      .where(eq(T_LeaguePerformance.memberId, memberId))
      .orderBy(desc(T_LeaguePerformance.points));
    // .leftJoin(T_LeaguePerformance, eq(T_LeaguePerformance.memberId, memberId))
    // .where(
    //   and(eq(T_LeagueRole.memberId, memberId), eq(T_LeagueRole.memberId, memberId))
    // );

    return res.status(200).send({
      tournaments: {
        all: tournamentsPerformance || [],
        best: tournamentsPerformance.at(0) || null,
        worst: tournamentsPerformance.at(-1) || tournamentsPerformance.at(0) || null,
      },
      leagues: {
        all: mainLeague,
        best: mainLeague.at(0) || null,
        worst: mainLeague.at(-1) || mainLeague.at(0) || null,
      },
    });
  } catch (error: any) {
    console.error('[ERROR] [getMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getBestAndWorstPerformance = (
  performance:
    | DB_SelectLeaguePerformance[]
    | {
        tournament_performance: DB_SelectTournamentPerformance;
        tournament: DB_SelectTournament | null;
      }[]
) => {
  const best = performance?.at(0);
  const worst = performance.at(-1);

  return { best, worst };
};

export const MemberController = {
  getMember,
  getMemberPerformance,
};
