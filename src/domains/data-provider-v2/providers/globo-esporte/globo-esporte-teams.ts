import { API_GloboEsporteStandings } from '@/domains/data-providers/globo-esporte/typing/api';
import axios from 'axios';
import { IApiProviderV2, TeamsRequest } from '../../interface';

export const GloboEsportTeams: IApiProviderV2['teams'] = {
  fetchTeamsFromStandings: async (req: TeamsRequest) => {
    const response = await axios.get(req.body.standingsUrl);

    return response.data as API_GloboEsporteStandings;
  },
  // mapTeamsFromStandings: (team: API_GloboEsporteTeam) => {
  //   return {
  //     name: team.nome_popular,
  //     externalId: String(team.equipe_id),
  //     shortName: team.sigla,
  //     badge: team.escudo,
  //     provider: 'ge',
  //   } satisfies DB_InsertTeam;
  // },
  // insertOnDB: async teams => db.insert(T_Team).values(teams).returning(),
  // updateOnDB: async teams => {
  //   return await db.transaction(async tx => {
  //     for (const team of teams) {
  //       return await tx
  //         .update(T_Team)
  //         .set(team)
  //         .where(eq(T_Team.externalId, team.externalId))
  //         .returning();
  //     }
  //   });
  // },
};
