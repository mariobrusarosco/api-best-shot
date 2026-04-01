import db from '@/core/database';
import type { MatchesResolvedTeam } from '@/domains/data-provider-v2/contracts/matches';
import { T_Team } from '@/domains/team/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const listResolvedTeamsByExternalId = async (input: {
  provider: 'sofascore';
  externalIds: string[];
}): Promise<MatchesResolvedTeam[]> => {
  if (input.externalIds.length === 0) {
    return [];
  }

  return await db
    .select({
      id: T_Team.id,
      externalId: T_Team.externalId,
      provider: T_Team.provider,
      name: T_Team.name,
      shortName: T_Team.shortName,
      badge: T_Team.badge,
    })
    .from(T_Team)
    .where(and(eq(T_Team.provider, input.provider), inArray(T_Team.externalId, input.externalIds)));
};
