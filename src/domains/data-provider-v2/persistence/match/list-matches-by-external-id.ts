import db from '@/core/database';
import type { MatchesResolvedMatch } from '@/domains/data-provider-v2/contracts/matches';
import { T_Match } from '@/domains/match/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const listMatchesByExternalId = async (input: {
  provider: 'sofascore';
  externalIds: string[];
}): Promise<MatchesResolvedMatch[]> => {
  if (input.externalIds.length === 0) {
    return [];
  }

  return await db
    .select({
      id: T_Match.id,
      externalId: T_Match.externalId,
      provider: T_Match.provider,
      tournamentId: T_Match.tournamentId,
      roundSlug: T_Match.roundSlug,
    })
    .from(T_Match)
    .where(and(eq(T_Match.provider, input.provider), inArray(T_Match.externalId, input.externalIds)));
};
