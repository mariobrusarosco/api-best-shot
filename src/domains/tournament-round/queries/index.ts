import db from '@/services/database';
import { T_TournamentRound, DB_InsertTournamentRound } from '@/domains/tournament-round/schema';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseError } from '@/domains/shared/error-handling/database';
import Profiling from '@/services/profiling';

const getRound = async (tournamentId: string, roundSlug: string) => {
  try {
    const [round] = await db
      .select()
      .from(T_TournamentRound)
      .where(
        and(
          eq(T_TournamentRound.tournamentId, tournamentId),
          eq(T_TournamentRound.slug, roundSlug)
        )
      );

    return round || null;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [getRound]', dbError);
    throw error;
  }
};

const getRegularSeasonRounds = async (tournamentId: string) => {
  try {
    const rounds = await db
      .select()
      .from(T_TournamentRound)
      .where(
        and(
          eq(T_TournamentRound.tournamentId, tournamentId),
          eq(T_TournamentRound.type, 'season')
        )
      )
      .orderBy(asc(T_TournamentRound.order));

    return rounds;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [getRegularSeasonRounds]', dbError);
    throw error;
  }
};

const getKnockoutRounds = async (tournamentId: string) => {
  try {
    const rounds = await db
      .select()
      .from(T_TournamentRound)
      .where(
        and(
          eq(T_TournamentRound.tournamentId, tournamentId),
          eq(T_TournamentRound.type, 'knockout')
        )
      )
      .orderBy(asc(T_TournamentRound.order));

    return rounds;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [getKnockoutRounds]', dbError);
    throw error;
  }
};

const getAllRounds = async (tournamentId: string) => {
  try {
    const rounds = await db
      .select()
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamentId))
      .orderBy(asc(T_TournamentRound.order));

    return rounds;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [getAllRounds]', dbError);
    throw error;
  }
};

const createTournamentRound = async (input: DB_InsertTournamentRound) => {
  try {
    const [round] = await db
      .insert(T_TournamentRound)
      .values(input)
      .returning();

    return round;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [createTournamentRound]', dbError);
    throw error;
  }
};

const createMultipleTournamentRounds = async (inputs: DB_InsertTournamentRound[]) => {
  try {
    const rounds = await db
      .insert(T_TournamentRound)
      .values(inputs)
      .returning();

    return rounds;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Profiling.error({
      source: 'QUERIES_TOURNAMENT_ROUND_createMultipleTournamentRounds',
      error: dbError,
    });
    throw error;
  }
};

export const QUERIES_TOURNAMENT_ROUND = {
  getRound,
  getRegularSeasonRounds,
  getKnockoutRounds,
  getAllRounds,
  createTournamentRound,
  createMultipleTournamentRounds,
};
