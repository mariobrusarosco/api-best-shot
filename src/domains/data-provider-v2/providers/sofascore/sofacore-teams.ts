import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApiNew } from '@/utils';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { IApiProviderV2, TeamsRequest } from '../../interface';
import { API_SofaScoreStandings } from './typing';
const SOFA_TEAN_LOGO_URL = 'https://img.sofascore.com/api/v1/team/:id/image/';

export const SofascoreTeams: IApiProviderV2['teams'] = {
  fetchTeamsFromStandings: async (req: TeamsRequest) => {
    const response = await axios.get(req.body.standingsUrl);

    return response.data as API_SofaScoreStandings;
  },
  mapTeamsFromStandings: async (standings: API_SofaScoreStandings, provider) => {
    const promises = standings?.standings[0]['rows']?.map(async team => {
      const badge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${team.team.id}`,
        logoUrl: SOFA_TEAN_LOGO_URL.replace(':id', String(team.team.id)),
      });

      return {
        name: team.team.name,
        externalId: String(team.team.id),
        shortName: team.team.nameCode,
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
  createOnDatabase: async teams => await db.insert(T_Team).values(teams).returning(),
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
};
