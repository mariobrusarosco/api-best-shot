import db from '@/core/database';
import type { StandingsResolvedTeam } from '@/domains/data-provider-v2/contracts/standings';
import { T_Team } from '@/domains/team/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const listTeamsByExternalId = async (input: {
  provider: 'sofascore';
  externalIds: string[];
}): Promise<StandingsResolvedTeam[]> => {
  if (input.externalIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: T_Team.id,
      externalId: T_Team.externalId,
      provider: T_Team.provider,
      name: T_Team.name,
      shortName: T_Team.shortName,
    })
    .from(T_Team)
    .where(and(eq(T_Team.provider, input.provider), inArray(T_Team.externalId, input.externalIds)));
};
