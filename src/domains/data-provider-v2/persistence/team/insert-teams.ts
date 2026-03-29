import db from '@/core/database';
import type { DiscoveredProviderTeam } from '@/domains/data-provider-v2/contracts/teams';
import { T_Team, type DB_SelectTeam } from '@/domains/team/schema';

export const insertTeams = async (input: {
  teams: Array<{
    discoveredTeam: DiscoveredProviderTeam;
    badgeUrl: string;
  }>;
}): Promise<DB_SelectTeam[]> => {
  if (input.teams.length === 0) {
    return [];
  }

  return await db
    .insert(T_Team)
    .values(
      input.teams.map(team => ({
        externalId: team.discoveredTeam.externalId,
        name: team.discoveredTeam.name,
        shortName: team.discoveredTeam.shortName,
        provider: team.discoveredTeam.provider,
        badge: team.badgeUrl,
      }))
    )
    .onConflictDoNothing()
    .returning();
};
