import db from '@/core/database';
import { T_Match, type DB_InsertMatch, type DB_SelectMatch } from '@/domains/match/schema';

export const upsertMatches = async (input: { matches: DB_InsertMatch[] }): Promise<DB_SelectMatch[]> => {
  if (input.matches.length === 0) {
    return [];
  }

  return await db.transaction(async tx => {
    const results: DB_SelectMatch[] = [];

    for (const match of input.matches) {
      const [upsertedMatch] = await tx
        .insert(T_Match)
        .values(match)
        .onConflictDoUpdate({
          target: [T_Match.externalId, T_Match.provider],
          set: {
            ...match,
          },
        })
        .returning();

      if (upsertedMatch) {
        results.push(upsertedMatch);
      }
    }

    return results;
  });
};
