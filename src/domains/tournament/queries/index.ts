import { T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';

import { DatabaseError } from '@/domains/shared/error-handling/database';
import { T_TournamentRound } from '@/domains/tournament-round/schema';
import {
  DB_InsertTournament,
  DB_InsertTournamentStandings,
  T_Tournament,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq, sql } from 'drizzle-orm';
import { TournamentWithTypedMode } from '../typing';

const allTournaments = async () => {
  try {
    return db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
        baseUrl: T_Tournament.baseUrl,
        provider: T_Tournament.provider,
        mode: T_Tournament.mode,
        standingsMode: T_Tournament.standingsMode,
        season: T_Tournament.season,
      })
      .from(T_Tournament);
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[Query_Tournament] - [queryAllMemberTournaments]', dbError);
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
        standingsMode: T_Tournament.standingsMode,
        season: T_Tournament.season,
      })
      .from(T_Tournament)
      .where(eq(T_Tournament.id, tournamentId));

    if (!tournament) {
      return null;
    }

    const rounds = await db
      .select({
        label: T_TournamentRound.label,
        slug: T_TournamentRound.slug,
      })
      .from(T_TournamentRound)
      .where(eq(T_TournamentRound.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentRound.order} as integer)`);

    return { ...(tournament as TournamentWithTypedMode), rounds };
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[Query_Tournament] - [queryTournament]', dbError);
    throw error;
  }
};

const knockoutRounds = async (tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(and(eq(T_TournamentRound.tournamentId, tournamentId), eq(T_TournamentRound.type, 'knockout')));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [allKnockoutRounds]', dbError);
    throw error;
  }
};

const getTournamentMatches = async (tournamentId: string) => {
  try {
    return db.select().from(T_Match).where(eq(T_Match.tournamentId, tournamentId));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [getTournamentMatches]', dbError);
    throw error;
  }
};

const getTournamentGuesses = async (memberId: string, tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [getTournamentGuesses]', dbError);
    throw error;
  }
};

const getMatchesWithNullGuess = async (memberId: string, tournamentId: string, round: string) => {
  try {
    const rows = await db
      .select()
      .from(T_Match)
      .leftJoin(T_Guess, and(eq(T_Match.id, T_Guess.matchId), eq(T_Guess.memberId, memberId)))
      .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundSlug, round)));

    return rows.filter((row: (typeof rows)[number]) => row.guess === null);
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [getMatchesWithNullGuess]', dbError);
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
        updatedAt: T_TournamentStandings.updatedAt,
      })
      .from(T_TournamentStandings)
      .where(eq(T_TournamentStandings.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentStandings.order} as integer)`);
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [getTournamentStandings]', dbError);
    throw error;
  }
};

const createTournament = async (input: DB_InsertTournament) => {
  try {
    const [tournament] = await db.insert(T_Tournament).values(input).returning();
    return tournament;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [createTournament]', dbError);
    throw error;
  }
};

const upsertTournamentStandings = async (standings: DB_InsertTournamentStandings[]) => {
  if (standings.length === 0) {
    return [];
  }

  try {
    await db.transaction(async (tx: unknown) => {
      const transaction = tx as typeof db;
      for (const standing of standings) {
        await transaction
          .insert(T_TournamentStandings)
          .values(standing)
          .onConflictDoUpdate({
            target: [T_TournamentStandings.shortName, T_TournamentStandings.tournamentId],
            set: {
              ...standing,
            },
          });
      }
    });

    return standings;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    console.error('[TournamentQueries] - [upsertTournamentStandings]', dbError);
    throw error;
  }
};

export type TournamentQuery = Awaited<ReturnType<typeof tournament>>;

export const QUERIES_TOURNAMENT = {
  allTournaments,
  tournament,
  knockoutRounds,

  getTournamentMatches,
  getTournamentGuesses,
  getMatchesWithNullGuess,

  getTournamentStandings,
  createTournament,
  upsertTournamentStandings,
};
