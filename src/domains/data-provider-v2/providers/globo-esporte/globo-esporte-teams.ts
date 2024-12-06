import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApiNew } from '@/utils';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { IApiProviderV2, TeamsRequest } from '../../interface';
import { API_GloboEsporteStandings } from './typing';

export const GloboEsporteTeams: IApiProviderV2['teams'] = {
  fetchTeamsFromStandings: async (req: TeamsRequest) => {
    const response = await axios.get(req.body.standingsUrl);

    return response.data as API_GloboEsporteStandings;
  },
  mapTeamsFromStandings: async (standings: API_GloboEsporteStandings) => {
    const promises = standings?.classificacao.map(async team => {
      const badge = await GloboEsporteTeams.fetchAndStoreLogo({
        filename: `team-${uuidv4()}`,
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
