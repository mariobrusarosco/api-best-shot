import db from '@/core/database';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { T_DataProviderExecutions } from '@/domains/data-provider/schema';
import { T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';
import { T_ScoreboardExecutions } from '@/domains/scoreboard/schema';
import type { DatabaseError } from '@/domains/shared/error-handling/database';
import { T_Team } from '@/domains/team/schema';
import { T_TournamentRound } from '@/domains/tournament-round/schema';
import {
  type DB_InsertTournament,
  type DB_InsertTournamentScoreboard,
  type DB_InsertTournamentStandings,
  type DB_SelectTournament,
  type DB_SelectTournamentScoreboard,
  T_Tournament,
  T_TournamentScoreboard,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import type { TournamentMode, TournamentWithTypedMode } from '@/domains/tournament/typing';
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';

type TournamentQueryExecutor = typeof db;
type TournamentDeleteBlocker = 'data_provider_execution' | 'scoreboard_execution';
type TournamentDeleteResult =
  | { outcome: 'not_found' }
  | { outcome: 'blocked'; blocker: TournamentDeleteBlocker; tournament: DB_SelectTournament }
  | { outcome: 'deleted'; tournament: DB_SelectTournament };

const updateTournamentScoreboardPoints = async (memberId: string, tournamentId: string, delta: number) => {
  try {
    await db
      .update(T_TournamentScoreboard)
      .set({
        points: sql`${T_TournamentScoreboard.points} + ${delta}`,
      })
      .where(and(eq(T_TournamentScoreboard.memberId, memberId), eq(T_TournamentScoreboard.tournamentId, tournamentId)));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'updateTournamentScoreboardPoints',
    });
    throw error;
  }
};

const bulkUpdateTournamentScoreboardPoints = async (
  tournamentId: string,
  updates: Map<string, number>,
  executor: TournamentQueryExecutor = db
) => {
  if (updates.size === 0) return;

  try {
    const values = Array.from(updates.entries());
    const sqlChunks: SQL[] = [];

    sqlChunks.push(sql`UPDATE ${T_TournamentScoreboard} AS ts`);
    sqlChunks.push(sql`SET points = ts.points + v.delta`);
    sqlChunks.push(sql`FROM (VALUES`);

    for (let i = 0; i < values.length; i++) {
      const [memberId, delta] = values[i];
      sqlChunks.push(sql`(${memberId}::uuid, ${delta}::integer)`);
      if (i < values.length - 1) {
        sqlChunks.push(sql`,`);
      }
    }

    sqlChunks.push(sql`) AS v(member_id, delta)`);
    sqlChunks.push(sql`WHERE ts.member_id = v.member_id AND ts.tournament_id = ${tournamentId}`);

    await executor.execute(sql.join(sqlChunks, sql` `));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'bulkUpdateTournamentScoreboardPoints',
    });
    throw error;
  }
};

const ensureTournamentScoreboardsExist = async (
  tournamentId: string,
  memberIds: string[],
  executor: TournamentQueryExecutor = db
): Promise<DB_SelectTournamentScoreboard[]> => {
  const uniqueMemberIds = Array.from(new Set(memberIds));

  if (uniqueMemberIds.length === 0) {
    return [];
  }

  try {
    const values: DB_InsertTournamentScoreboard[] = uniqueMemberIds.map(memberId => ({
      tournamentId,
      memberId,
      points: 0,
    }));

    return await executor
      .insert(T_TournamentScoreboard)
      .values(values)
      .onConflictDoNothing({
        target: [T_TournamentScoreboard.memberId, T_TournamentScoreboard.tournamentId],
      })
      .returning();
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'upsertMissingTournamentScoreboards',
    });
    throw error;
  }
};

const allTournaments = async () => {
  try {
    return db
      .select({
        id: T_Tournament.id,
        label: T_Tournament.label,
        logo: T_Tournament.logo,
        baseUrl: T_Tournament.baseUrl,
        publicUrl: T_Tournament.publicUrl,
        provider: T_Tournament.provider,
        mode: T_Tournament.mode,
        standingsMode: T_Tournament.standingsMode,
        season: T_Tournament.season,
        currentRound: T_Tournament.currentRound,
      })
      .from(T_Tournament)
      .where(eq(T_Tournament.status, 'active'));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'allTournaments',
    });
    throw error;
  }
};

const listActiveTournamentsByModes = async (modes: TournamentMode[]) => {
  if (modes.length === 0) {
    return [];
  }

  try {
    return db
      .select({
        id: T_Tournament.id,
        slug: T_Tournament.slug,
      })
      .from(T_Tournament)
      .where(and(eq(T_Tournament.status, 'active'), inArray(T_Tournament.mode, modes)));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'listActiveTournamentsByModes',
    });
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
        publicUrl: T_Tournament.publicUrl,
        provider: T_Tournament.provider,
        mode: T_Tournament.mode,
        standingsMode: T_Tournament.standingsMode,
        season: T_Tournament.season,
        currentRound: T_Tournament.currentRound,
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
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'tournament',
    });
    throw error;
  }
};

const tournamentRecord = async (tournamentId: string): Promise<DB_SelectTournament | null> => {
  try {
    const [tournament] = await db.select().from(T_Tournament).where(eq(T_Tournament.id, tournamentId));

    return tournament ?? null;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'tournamentRecord',
    });
    throw error;
  }
};

const hasInProgressDataProviderExecutions = async (
  tournamentId: string,
  executor: TournamentQueryExecutor = db
): Promise<boolean> => {
  const [executionJob] = await executor
    .select({ id: T_DataProviderExecutions.id })
    .from(T_DataProviderExecutions)
    .where(
      and(eq(T_DataProviderExecutions.tournamentId, tournamentId), eq(T_DataProviderExecutions.status, 'in_progress'))
    )
    .limit(1);

  return !!executionJob;
};

const hasInProgressScoreboardExecutions = async (
  tournamentId: string,
  executor: TournamentQueryExecutor = db
): Promise<boolean> => {
  const [executionJob] = await executor
    .select({ id: T_ScoreboardExecutions.id })
    .from(T_ScoreboardExecutions)
    .where(and(eq(T_ScoreboardExecutions.tournamentId, tournamentId), eq(T_ScoreboardExecutions.status, 'in_progress')))
    .limit(1);

  return !!executionJob;
};

const knockoutRounds = async (tournamentId: string) => {
  try {
    return db
      .select()
      .from(T_TournamentRound)
      .where(and(eq(T_TournamentRound.tournamentId, tournamentId), eq(T_TournamentRound.type, 'knockout')));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'knockoutRounds',
    });
    throw error;
  }
};

const getTournamentMatches = async (tournamentId: string) => {
  try {
    return db.select().from(T_Match).where(eq(T_Match.tournamentId, tournamentId));
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getTournamentMatches',
    });
    throw error;
  }
};

const getMemberTournamentScoreboardPoints = async (memberId: string, tournamentId: string): Promise<number> => {
  try {
    const [row] = await db
      .select({ points: T_TournamentScoreboard.points })
      .from(T_TournamentScoreboard)
      .where(and(eq(T_TournamentScoreboard.memberId, memberId), eq(T_TournamentScoreboard.tournamentId, tournamentId)))
      .limit(1);

    return row?.points ?? 0;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getMemberTournamentScoreboardPoints',
    });
    throw error;
  }
};

const getMemberTournamentScoreboardPointsAcrossTournaments = async (
  memberId: string,
  tournamentIds: string[]
): Promise<number> => {
  if (tournamentIds.length === 0) {
    return 0;
  }

  try {
    const [row] = await db
      .select({
        points: sql<number>`coalesce(sum(${T_TournamentScoreboard.points}), 0)`,
      })
      .from(T_TournamentScoreboard)
      .where(
        and(eq(T_TournamentScoreboard.memberId, memberId), inArray(T_TournamentScoreboard.tournamentId, tournamentIds))
      );

    return row?.points ?? 0;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getMemberTournamentScoreboardPointsAcrossTournaments',
    });
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
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getTournamentGuesses',
    });
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
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getMatchesWithNullGuess',
    });
    throw error;
  }
};

const getTournamentStandings = async (tournamentId: string) => {
  try {
    return db
      .select({
        id: T_TournamentStandings.teamId,
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
        form: T_TournamentStandings.form,
        gf: T_TournamentStandings.gf,
        ga: T_TournamentStandings.ga,
        gd: T_TournamentStandings.gd,
        provider: T_TournamentStandings.provider,
        updatedAt: T_TournamentStandings.updatedAt,
        teamBadge: T_Team.badge,
      })
      .from(T_TournamentStandings)
      .leftJoin(T_Team, eq(T_Team.externalId, T_TournamentStandings.teamExternalId))
      .where(eq(T_TournamentStandings.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentStandings.order} as integer)`);
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'getTournamentStandings',
    });
    throw error;
  }
};

const createTournament = async (input: DB_InsertTournament) => {
  try {
    const [tournament] = await db.insert(T_Tournament).values(input).returning();
    return tournament;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'createTournament',
    });
    throw error;
  }
};

const deleteTournamentAggregate = async (tournamentId: string): Promise<TournamentDeleteResult> => {
  try {
    return await db.transaction(async tx => {
      const [existingTournament] = await tx
        .select()
        .from(T_Tournament)
        .where(eq(T_Tournament.id, tournamentId))
        .limit(1);

      if (!existingTournament) {
        return { outcome: 'not_found' };
      }

      // Lock the parent row so a new child execution cannot race the destructive delete.
      await tx.execute(
        sql`select ${T_Tournament.id} from ${T_Tournament} where ${T_Tournament.id} = ${tournamentId} for update`
      );

      if (await hasInProgressDataProviderExecutions(tournamentId, tx)) {
        return {
          outcome: 'blocked',
          blocker: 'data_provider_execution',
          tournament: existingTournament,
        };
      }

      if (await hasInProgressScoreboardExecutions(tournamentId, tx)) {
        return {
          outcome: 'blocked',
          blocker: 'scoreboard_execution',
          tournament: existingTournament,
        };
      }

      const tournamentMatches = await tx
        .select({ id: T_Match.id })
        .from(T_Match)
        .where(eq(T_Match.tournamentId, tournamentId));
      const matchIds = tournamentMatches.map(match => match.id);

      await tx.delete(T_DataProviderExecutions).where(eq(T_DataProviderExecutions.tournamentId, tournamentId));

      if (matchIds.length > 0) {
        await tx.delete(T_DataProviderExecutions).where(inArray(T_DataProviderExecutions.matchId, matchIds));
      }

      await tx.delete(T_TournamentStandings).where(eq(T_TournamentStandings.tournamentId, tournamentId));

      const [deletedTournament] = await tx.delete(T_Tournament).where(eq(T_Tournament.id, tournamentId)).returning();

      if (!deletedTournament) {
        return { outcome: 'not_found' };
      }

      return {
        outcome: 'deleted',
        tournament: deletedTournament,
      };
    });
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'deleteTournamentAggregate',
      tournamentId,
    });
    throw error;
  }
};

const updateTournamentCurrentRound = async (
  tournamentId: string,
  currentRound: string
): Promise<DB_SelectTournament | null> => {
  try {
    const [tournament] = await db
      .update(T_Tournament)
      .set({ currentRound })
      .where(eq(T_Tournament.id, tournamentId))
      .returning();

    return tournament || null;
  } catch (error: unknown) {
    const dbError = error as DatabaseError;
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'updateTournamentCurrentRound',
    });
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
    Logger.error(dbError, {
      domain: DOMAINS.TOURNAMENT,
      component: 'database',
      operation: 'upsertTournamentStandings',
    });
    throw error;
  }
};

export type TournamentQuery = Awaited<ReturnType<typeof tournament>>;

export const QUERIES_TOURNAMENT = {
  allTournaments,
  listActiveTournamentsByModes,
  tournament,
  tournamentRecord,
  knockoutRounds,

  getTournamentMatches,
  getMemberTournamentScoreboardPoints,
  getMemberTournamentScoreboardPointsAcrossTournaments,
  getTournamentGuesses,
  getMatchesWithNullGuess,

  getTournamentStandings,
  createTournament,
  deleteTournamentAggregate,
  updateTournamentCurrentRound,
  upsertTournamentStandings,
  updateTournamentScoreboardPoints,
  bulkUpdateTournamentScoreboardPoints,
  ensureTournamentScoreboardsExist,
};
