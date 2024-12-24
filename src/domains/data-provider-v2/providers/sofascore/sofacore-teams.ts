import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApiNew } from '@/utils';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../../interface';
import { API_SofaScoreStandings } from './typing';
const SOFA_TEAM_LOGO_URL = 'https://img.sofascore.com/api/v1/team/:id/image/';

export const SofascoreTeams: IApiProviderV2['teams'] = {
  fetchTeamsFromStandings: async (baseUrl: string) => {
    const response = await axios.get(`${baseUrl}/standings/total`);

    return response.data as API_SofaScoreStandings;
  },
  mapTeamsFromStandings: async (data: API_SofaScoreStandings, provider) => {
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

    return Promise.all(promises);
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApiNew(data);

    return assetPath ? `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}` : '';
  },
  createOnDatabase: async teams =>
    await db.insert(T_Team).values(teams).onConflictDoNothing().returning(),
  updateOnDatabase: async teams => {
    return await db.transaction(async tx => {
      for (const team of teams) {
        return await tx
          .update(T_Team)
          .set(team)
          .where(eq(T_Team.externalId, team.externalId))
          .returning();
      }
    });
  },
  fetchTeamsFromAvailableRounds: async (allAvailableRounds, baseUrl) => {
    const allTeams = allAvailableRounds.map(async round => {
      let urlToFetch = '';

      if (round.type === 'knockout') {
        urlToFetch = `${baseUrl}/events/round/${round.order}/slug/${round.slug}`;
      }

      if (round.type === 'season') {
        urlToFetch = `${baseUrl}/season/rounds/${round.order}`;
      }

      const response = await axios.get(urlToFetch);

      return response.data;
    });

    return Promise.all(allTeams);
  },
  mapTeamsFromAvailableRounds: async (data, provider) => {
    const round = data[0].events;

    const promises = round.map(async (game: any) => {
      const homeTeam = game.homeTeam;
      const homeTeamBadge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${homeTeam.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(homeTeam.id)),
      });

      const awayTeam = game.awayTeam;
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

    return Promise.all(promises);
  },
};
