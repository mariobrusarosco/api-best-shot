import { T_TournamentPerformance } from '@/domains/performance/schema';
import db from '@/services/database';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { T_Tournament } from '@/domains/tournament/schema';
import { T_LeagueTournament } from '@/domains/league/schema';
import { T_LeagueRole } from '@/domains/league/schema';
import { T_Member } from '@/domains/member/schema';

const member = {
  selectTournamentPerformance: async (memberId: string, tournamentId: string) => {
    return db.query.T_TournamentPerformance.findFirst({
      where: (tournamentPerformance, { eq }) =>
        eq(tournamentPerformance.memberId, memberId) &&
        eq(tournamentPerformance.tournamentId, tournamentId),
    });
  },
  updatePerformance: async (
    points: number | null | undefined,
    memberId: string,
    tournamentId: string
  ) => {
    const [query] = await db
      .update(T_TournamentPerformance)
      .set({
        points: points?.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(T_TournamentPerformance.memberId, memberId),
          eq(T_TournamentPerformance.tournamentId, tournamentId)
        )
      )
      .returning();

    return query;
  },
  getGeneralPerformance: async (memberId: string) => {
    return db.query.T_TournamentPerformance.findMany({
      where: (tournamentPerformance, { eq }) =>
        eq(tournamentPerformance.memberId, memberId),
    });
  },
  getPerformanceLastUpdated: async (memberId: string) => {
    return db.query.T_TournamentPerformance.findFirst({
      where: (tournamentPerformance, { eq }) =>
        eq(tournamentPerformance.memberId, memberId),
    });
  },
};

const league = {
  getPerformance: async (leagueId: string) => {
    try {
      const leagueMembersSubquery = db
        .select({
          memberId: T_LeagueRole.memberId,
        })
        .from(T_LeagueRole)
        .where(eq(T_LeagueRole.leagueId, leagueId));

      const leagueTournamentsSubquery = db
        .select({
          tournamentId: T_LeagueTournament.tournamentId,
        })
        .from(T_LeagueTournament)
        .where(
          and(
            eq(T_LeagueTournament.leagueId, leagueId),
            eq(T_LeagueTournament.status, 'tracked')
          )
        );

      // Main query combining the subquery
      const query = await db
        .select({
          id: T_Tournament.label,
          logo: T_Tournament.logo,
          member: T_Member.nickName,
          points: T_TournamentPerformance.points,
        })
        .from(T_TournamentPerformance)
        .leftJoin(T_Tournament, eq(T_Tournament.id, T_TournamentPerformance.tournamentId))
        .leftJoin(T_Member, eq(T_Member.id, T_TournamentPerformance.memberId))
        .where(
          and(
            inArray(T_TournamentPerformance.memberId, leagueMembersSubquery),
            inArray(T_TournamentPerformance.tournamentId, leagueTournamentsSubquery)
          )
        )
        .orderBy(desc(sql`cast(${T_TournamentPerformance.points} as integer)`));

      return query;
    } catch (error: any) {
      throw error;
    }
  },
  getPerformanceLastUpdated: async (leagueId: string) => {
    try {
      const query = await db.query.T_LeaguePerformance.findFirst({
        where: (leaguePerformance, { eq }) => eq(leaguePerformance.leagueId, leagueId),
      });

      return query;
    } catch (error: any) {
      console.error('[DB_PERFORMANCE] - [getLeaguePerformanceLastUpdated] ', error);
      return null;
    }
  },
};

const tournament = {
  getPerformance: async (memberId: string, tournamentId: string | null) => {
    if (!tournamentId) {
      return null;
    }

    const query = await db.query.T_TournamentPerformance.findFirst({
      where: (tournamentPerformance, { eq }) =>
        eq(tournamentPerformance.memberId, memberId) &&
        eq(tournamentPerformance.tournamentId, tournamentId),
    });

    return query ?? null;
  },
  getMemberGeneralPerformance: async (memberId: string) => {
    return db
      .select()
      .from(T_TournamentPerformance)
      .leftJoin(T_Tournament, eq(T_Tournament.id, T_TournamentPerformance.tournamentId))
      .where(eq(T_TournamentPerformance.memberId, memberId));
  },
  updatePerformance: async (
    points: number | null | undefined,
    memberId: string,
    tournamentId: string
  ) => {
    const [query] = await db
      .update(T_TournamentPerformance)
      .set({
        points: points?.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(T_TournamentPerformance.memberId, memberId),
          eq(T_TournamentPerformance.tournamentId, tournamentId)
        )
      )
      .returning();

    return query;
  },
};

export const QUERIES_PERFORMANCE = {
  // member,
  league,
  tournament,
};
