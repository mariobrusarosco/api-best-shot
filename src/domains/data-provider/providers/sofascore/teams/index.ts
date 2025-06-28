import { API_SOFASCORE_STANDINGS } from '@/domains/data-provider/providers/sofascore/standings/typing';
import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApi } from '@/utils';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
const SOFA_TEAM_LOGO_URL = 'https://img.sofascore.com/api/v1/team/:id/image';

export const SofascoreTeams: IApiProvider['teams'] = {
  mapTeamsFromStandings: async (data: API_SOFASCORE_STANDINGS, provider) => {
    if (!data?.standings) return [];

    const standings = data?.standings;
    const groupOfTeams = standings.map(groupOfTeams => groupOfTeams.rows);
    const allTournamentTeams = groupOfTeams.flat();

    const promises = allTournamentTeams.map(async ({ team }) => {
      const badge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${team.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(team.id)),
      });
      return {
        name: team.name,
        externalId: String(team.id),
        shortName: team.nameCode,
        badge,
        provider: 'sofa',
      } satisfies DB_InsertTeam;
    });

    const teams = await Promise.all(promises);
    console.log(`[LOG] - [SUCCESS] - MAPPED ${teams.length} TEAMS FROM STANDINGS`);

    return teams;
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApi(data);

    return assetPath ? `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}` : '';
  },
  mapTeamsFromRound: async (round, provider) => {
    const matches = round.events;

    const promises = matches.map(async (match: any) => {
      const homeTeam = match.homeTeam;
      const homeTeamBadge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${homeTeam.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(homeTeam.id)),
      });

      const awayTeam = match.awayTeam;
      const awayTeamBadge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${awayTeam.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(awayTeam.id)),
      });

      return [
        {
          name: homeTeam.name,
          externalId: String(homeTeam.id),
          shortName: homeTeam.nameCode,
          badge: homeTeamBadge,
          provider: 'sofa',
        } satisfies DB_InsertTeam,
        {
          name: awayTeam.name,
          externalId: String(awayTeam.id),
          shortName: awayTeam.nameCode,
          badge: awayTeamBadge,
          provider: 'sofa',
        } satisfies DB_InsertTeam,
      ];
    });

    const teams = (await Promise.all(promises)).flat();
    console.log(`[LOG] - SUCCESS - MAPPED TEAMS FROM ROUND:  ${teams.length}`);

    return teams;
  },
  createOnDatabase: async teams => {
    console.log(`[LOG] - [START] - CREATING TEAMS ON DATABASE`);

    const createdTeams = await db
      .insert(T_Team)
      .values(teams)
      .onConflictDoNothing()
      .returning();

    console.log(`[LOG] - [START] - CREATED TEAMS ${createdTeams.length} ON DATABASE`);

    return createdTeams;
  },
  upsertOnDatabase: async teams => {
    console.log('[LOG] - [START] - UPSERTING TEAMS ON DATABASE');

    await db.transaction(async (tx: PostgresJsDatabase<any>) => {
      for (const team of teams) {
        await tx
          .insert(T_Team)
          .values(team)
          .onConflictDoUpdate({
            target: [T_Team.externalId, T_Team.provider],
            set: {
              ...team,
            },
          });

        // console.log('[LOG] - [SofascoreTeams] - UPSERTING TEAM: ', team);
      }
    });
    console.log('[LOG] - [SUCCESS] - UPSERTING TEAMS ON DATABASE');
  },
};
