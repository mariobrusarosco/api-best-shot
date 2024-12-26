//@ts-nocheck
import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApi } from '@/utils';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../../../data-provider/typying/main-interface';
import { API_GloboEsporteStandings } from './typing';

export const GloboEsporteTeams: IApiProviderV2['teams'] = {
  fetchTeamsFromStandings: async (standingsUrl: string) => {
    const response = await axios.get(standingsUrl);

    return response.data as API_GloboEsporteStandings;
  },
  mapTeamsFromStandings: async (standings: API_GloboEsporteStandings, provider) => {
    const promises = standings?.classificacao.map(async team => {
      const badge = await GloboEsporteTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${team.equipe_id}`,
        logoUrl: team?.escudo || '',
      });

      return {
        name: team.nome_popular,
        externalId: String(team.equipe_id),
        shortName: team.sigla,
        badge,
        provider: 'ge',
      } satisfies DB_InsertTeam;
    });

    return Promise.all(promises);
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApi(data);

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
