import db from '@/services/database';
import {
  T_TournamentRound,
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
} from '@/domains/tournament-round/schema';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseError } from '@/domains/shared/error-handling/database';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';

const getRound = async (tournamentId: string, roundSlug: string) => {
  try {
    const [round] = await db
      .select()
      .from(T_TournamentRound)
      .where(and(eq(T_TournamentRound.tournamentId, tournamentId), eq(T_TournamentRound.slug, roundSlug)));

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
      .where(and(eq(T_TournamentRound.tournamentId, tournamentId), eq(T_TournamentRound.type, 'season')))
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
      .where(and(eq(T_TournamentRound.tournamentId, tournamentId), eq(T_TournamentRound.type, 'knockout')))
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

const createTournamentRounds = async (inputs: DB_InsertTournamentRound[]) => {
  try {
    const rounds = await db.insert(T_TournamentRound).values(inputs).returning();

    return rounds;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'createTournamentRounds',
    });
    throw error;
  }
};

const upsertTournamentRounds = async (rounds: DB_UpdateTournamentRound[]) => {
  if (rounds.length === 0) {
    return [];
  }

  try {
    const query = await db.transaction(async (tx: unknown) => {
      const transaction = tx as typeof db;
      const results = [];
      for (const round of rounds) {
        const result = await transaction
          .insert(T_TournamentRound)
          .values(round)
          .onConflictDoUpdate({
            target: [T_TournamentRound.slug, T_TournamentRound.tournamentId],
            set: {
              ...round,
            },
          })
          .returning();
        results.push(result[0]);
      }
      return results;
    });

    return query;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[QUERIES_TOURNAMENT_ROUND] - [upsertTournamentRounds]', dbError);
    throw error;
  }
};

export const QUERIES_TOURNAMENT_ROUND = {
  getRound,
  getRegularSeasonRounds,
  getKnockoutRounds,
  getAllRounds,
  createTournamentRounds,
  upsertTournamentRounds,
};
