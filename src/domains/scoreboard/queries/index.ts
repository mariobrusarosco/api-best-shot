import db from '@/core/database';
import { DB_InsertScoreboardLedger, DB_SelectScoreboardLedger, T_ScoreboardLedger } from '@/domains/scoreboard/schema';
import { and, eq } from 'drizzle-orm';

const insertLedgerEntriesConflictSafe = async (
  entries: DB_InsertScoreboardLedger[]
): Promise<DB_SelectScoreboardLedger[]> => {
  if (entries.length === 0) {
    return [];
  }

  return db
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

export const QUERIES_SCOREBOARD = {
  insertLedgerEntriesConflictSafe,
  listLedgerEntriesByMatch,
  hasLedgerEntriesForMatch,
};
