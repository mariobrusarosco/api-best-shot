import db from '@/services/database';
import { and, eq, sql } from 'drizzle-orm';
import { T_Tournament, T_TournamentRound, T_TournamentStandings } from '../schema';
import { T_TournamentPerformance } from '@/domains/performance/schema';
import { T_Match } from '@/domains/match/schema';
import { T_Guess } from '@/domains/guess/schema';
import Profiling from '@/services/profiling';

const allTournaments = async () => {
  try {
    return db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
      })
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, 'sofa'));
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryAllMemberTournaments]', error);
    throw error;
  }
};

const tournament = async (tournamentId: string) => {
  try {
    const [tournament] = await db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
        baseUrl: T_Tournament.baseUrl,
        provider: T_Tournament.provider,
        mode: T_Tournament.mode,
        standings: T_Tournament.standings,
      })
      .from(T_Tournament)
      .where(and(eq(T_Tournament.provider, 'sofa'), eq(T_Tournament.id, tournamentId)));

    const rounds = await db
      .select({
        label: T_TournamentRound.label,
        slug: T_TournamentRound.slug,
      })
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentRound.order} as integer)`);

    return { ...tournament, rounds };
  } catch (error: any) {
    console.error('[Query_Tournament] - [queryTournament]', error);
    throw error;
  }
};

const allTournamentRounds = async (tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamentId));
  } catch (error: any) {
    console.error('[TournamentQueries] - [allAvailableRounds]', error);
    throw error;
  }
};

const knockoutRounds = async (tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(
        and(
          eq(T_TournamentRound.tournamentId, tournamentId),
          eq(T_TournamentRound.type, 'knockout')
        )
      );
  } catch (error: any) {
    console.error('[TournamentQueries] - [allKnockoutRounds]', error);
    throw error;
  }
};

const checkOnboardingStatus = async (memberId: string, tournamentId: string) => {
  try {
    const [tournamentPerformance] = await db
      .select()
      .from(T_TournamentPerformance)
      .where(
        and(
          eq(T_TournamentPerformance.tournamentId, tournamentId),
          eq(T_TournamentPerformance.memberId, memberId)
        )
      );

    return !!tournamentPerformance;
  } catch (error: any) {
    Profiling.error('checkOnboardingStatus', error);
    return false;
  }
};

const getTournamentMatches = async (tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_Match)
      .where(eq(T_Match.tournamentId, tournamentId));
  } catch (error: any) {
    console.error('[TournamentQueries] - [getTournamentMatches]', error);
    throw error;
  }
};

const getTournamentGuesses = async (memberId: string, tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(
        and(
          eq(T_Guess.memberId, memberId), 
          eq(T_Match.tournamentId, tournamentId)
        )
      );
  } catch (error: any) {
    console.error('[TournamentQueries] - [getTournamentGuesses]', error);
    throw error;
  }
};

const getMatchesWithNullGuess = async (memberId: string, tournamentId: string, round: string) => {
  try {
    const rows = await db
      .select()
      .from(T_Match)
      .leftJoin(
        T_Guess,
        and(eq(T_Match.id, T_Guess.matchId), eq(T_Guess.memberId, memberId))
      )
      .where(
        and(
          eq(T_Match.tournamentId, tournamentId), 
          eq(T_Match.roundSlug, round)
        )
      );

    return rows.filter(row => row.guess === null);
  } catch (error: any) {
    console.error('[TournamentQueries] - [getMatchesWithNullGuess]', error);
    throw error;
  }
};

const createTournamentPerformance = async (memberId: string, tournamentId: string) => {
  try {
    const [performance] = await db
      .insert(T_TournamentPerformance)
      .values({
        memberId,
        tournamentId,
        points: String(0),
      })
      .returning();
    
    return performance;
  } catch (error: any) {
    console.error('[TournamentQueries] - [createTournamentPerformance]', error);
    throw error;
  }
};

const getTournamentStandings = async (tournamentId: string) => {
  try {
    return db
      .select({
        id: T_TournamentStandings.id,
        teamExternalId: T_TournamentStandings.teamExternalId,
        order: T_TournamentStandings.order,
        groupName: T_TournamentStandings.groupName,
        shortName: T_TournamentStandings.shortName,
        longName: T_TournamentStandings.longName,
        points: T_TournamentStandings.points,
        games: T_TournamentStandings.games,
        wins: T_TournamentStandings.wins,
        draws: T_TournamentStandings.draws,
        losses: T_TournamentStandings.losses,
        gf: T_TournamentStandings.gf,
        ga: T_TournamentStandings.ga,
        gd: T_TournamentStandings.gd,
        provider: T_TournamentStandings.provider,
        updatedAt: T_TournamentStandings.updatedAt
      })
      .from(T_TournamentStandings)
      .where(eq(T_TournamentStandings.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentStandings.order} as integer)`);
  } catch (error: any) {
    console.error('[TournamentQueries] - [getTournamentStandings]', error);
    throw error;
  }
};

export type TournamentQuery = Awaited<ReturnType<typeof tournament>>;

export const QUERIES_TOURNAMENT = {
  allTournaments,
  tournament,
  allTournamentRounds,
  knockoutRounds,
  checkOnboardingStatus,
  getTournamentMatches,
  getTournamentGuesses,
  getMatchesWithNullGuess,
  createTournamentPerformance,
  getTournamentStandings
};