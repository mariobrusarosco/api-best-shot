import db from '@/core/database';
import { T_Match, type DB_InsertMatch, type DB_SelectMatch } from '@/domains/match/schema';

export const insertMatches = async (input: { matches: DB_InsertMatch[] }): Promise<DB_SelectMatch[]> => {
  if (input.matches.length === 0) {
    return [];
  }

  return await db.insert(T_Match).values(input.matches).onConflictDoNothing().returning();
};
