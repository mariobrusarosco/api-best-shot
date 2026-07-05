import db from '@/core/database';
import type { DiscoveredProviderTeam } from '@/domains/data-provider-v2/contracts/teams';
import { T_Team, type DB_SelectTeam } from '@/domains/team/schema';

export const upsertTeams = async (input: {
  teams: Array<{
    discoveredTeam: DiscoveredProviderTeam;
    badgeUrl: string;
  }>;
}): Promise<DB_SelectTeam[]> => {
  if (input.teams.length === 0) {
    return [];
  }

  return await db.transaction(async tx => {
    const upsertedTeams: DB_SelectTeam[] = [];

    for (const team of input.teams) {
      const [upsertedTeam] = await tx
        .insert(T_Team)
        .values({
          externalId: team.discoveredTeam.externalId,
          name: team.discoveredTeam.name,
          shortName: team.discoveredTeam.shortName,
          provider: team.discoveredTeam.provider,
          badge: team.badgeUrl,
        })
        .onConflictDoUpdate({
          target: [T_Team.provider, T_Team.externalId],
          set: {
            name: team.discoveredTeam.name,
            shortName: team.discoveredTeam.shortName,
            badge: team.badgeUrl,
          },
        })
        .returning();

      if (upsertedTeam) {
        upsertedTeams.push(upsertedTeam);
      }
    }

    return upsertedTeams;
  });
};
