import db from '@/core/database';
import { SCOREBOARD_EXECUTION_STATUSES, type ScoreboardOperationType } from '@/domains/scoreboard/contracts';
import {
  DB_InsertScoreboardExecution,
  DB_InsertScoreboardLedger,
  DB_SelectScoreboardExecution,
  DB_SelectScoreboardLedger,
  DB_UpdateScoreboardExecution,
  T_ScoreboardExecutions,
  T_ScoreboardLedger,
} from '@/domains/scoreboard/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

type GetExecutionsByTournamentOptions = {
  operationType?: DB_SelectScoreboardExecution['operationType'];
  status?: DB_SelectScoreboardExecution['status'];
  limit?: number;
  offset?: number;
};

type ScoreboardQueryExecutor = typeof db;

const insertLedgerEntriesConflictSafe = async (
  entries: DB_InsertScoreboardLedger[],
  executor: ScoreboardQueryExecutor = db
): Promise<DB_SelectScoreboardLedger[]> => {
  if (entries.length === 0) {
    return [];
  }

  return executor
    .insert(T_ScoreboardLedger)
    .values(entries)
    .onConflictDoNothing({
      target: [T_ScoreboardLedger.matchId, T_ScoreboardLedger.memberId, T_ScoreboardLedger.ruleVersion],
    })
    .returning();
};

const listLedgerEntriesByMatch = async (matchId: string): Promise<DB_SelectScoreboardLedger[]> => {
  return db.select().from(T_ScoreboardLedger).where(eq(T_ScoreboardLedger.matchId, matchId));
};

const hasLedgerEntriesForMatch = async (matchId: string, ruleVersion = 1): Promise<boolean> => {
  const [row] = await db
    .select({ id: T_ScoreboardLedger.id })
    .from(T_ScoreboardLedger)
    .where(and(eq(T_ScoreboardLedger.matchId, matchId), eq(T_ScoreboardLedger.ruleVersion, ruleVersion)))
    .limit(1);

  return !!row;
};

const createExecution = async (execution: DB_InsertScoreboardExecution): Promise<DB_SelectScoreboardExecution> => {
  const [result] = await db.insert(T_ScoreboardExecutions).values(execution).returning();
  return result;
};

const updateExecution = async (
  id: string,
  updates: Partial<DB_UpdateScoreboardExecution>
): Promise<DB_SelectScoreboardExecution | null> => {
  const [result] = await db
    .update(T_ScoreboardExecutions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(T_ScoreboardExecutions.id, id))
    .returning();

  return result || null;
};

const updateExecutionByRequestId = async (
  requestId: string,
  updates: Partial<DB_UpdateScoreboardExecution>
): Promise<DB_SelectScoreboardExecution | null> => {
  const [result] = await db
    .update(T_ScoreboardExecutions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(T_ScoreboardExecutions.requestId, requestId))
    .returning();

  return result || null;
};

const getExecutionById = async (id: string): Promise<DB_SelectScoreboardExecution | null> => {
  const [result] = await db.select().from(T_ScoreboardExecutions).where(eq(T_ScoreboardExecutions.id, id)).limit(1);
  return result || null;
};

const getExecutionByRequestId = async (requestId: string): Promise<DB_SelectScoreboardExecution | null> => {
  const [result] = await db
    .select()
    .from(T_ScoreboardExecutions)
    .where(eq(T_ScoreboardExecutions.requestId, requestId))
    .limit(1);

  return result || null;
};

const getExecutionsByTournament = async (
  tournamentId: string,
  options?: GetExecutionsByTournamentOptions
): Promise<DB_SelectScoreboardExecution[]> => {
  const conditions = [eq(T_ScoreboardExecutions.tournamentId, tournamentId)];

  if (options?.operationType) {
    conditions.push(eq(T_ScoreboardExecutions.operationType, options.operationType));
  }

  if (options?.status) {
    conditions.push(eq(T_ScoreboardExecutions.status, options.status));
  }

  const baseQuery = db
    .select()
    .from(T_ScoreboardExecutions)
    .where(and(...conditions))
    .orderBy(desc(T_ScoreboardExecutions.startedAt));

  if (options?.limit && options?.offset) {
    return await baseQuery.limit(options.limit).offset(options.offset);
  } else if (options?.limit) {
    return await baseQuery.limit(options.limit);
  } else if (options?.offset) {
    return await baseQuery.offset(options.offset);
  }

  return await baseQuery;
};

const listTournamentIdsWithInProgressExecutions = async (params: {
  operationType: ScoreboardOperationType;
  tournamentIds?: string[];
}): Promise<string[]> => {
  if (params.tournamentIds && params.tournamentIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(T_ScoreboardExecutions.operationType, params.operationType),
    eq(T_ScoreboardExecutions.status, SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS),
  ];

  if (params.tournamentIds) {
    conditions.push(inArray(T_ScoreboardExecutions.tournamentId, params.tournamentIds));
  }

  const rows = await db
    .selectDistinct({ tournamentId: T_ScoreboardExecutions.tournamentId })
    .from(T_ScoreboardExecutions)
    .where(and(...conditions));

  return rows.map(row => row.tournamentId);
};

export const QUERIES_SCOREBOARD = {
  insertLedgerEntriesConflictSafe,
  listLedgerEntriesByMatch,
  hasLedgerEntriesForMatch,
  createExecution,
  updateExecution,
  updateExecutionByRequestId,
  getExecutionById,
  getExecutionByRequestId,
  getExecutionsByTournament,
  listTournamentIdsWithInProgressExecutions,
};
