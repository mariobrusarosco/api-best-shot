import { T_Team } from '@/domains/team/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { ProviderGloboEsporte } from '.';
import { IApiProvider } from '../typing';
import { API_GloboEsporteStandings, GLOBO_ESPORTE_TOURNAMENT_API } from './typing/api';

export const tournamentProvider: IApiProvider['tournament'] = {
  createUrl: ({ externalId }) =>
    GLOBO_ESPORTE_TOURNAMENT_API.replace(':external_id', externalId),
  insertOnDB: async data => {
    return db.insert(T_Tournament).values(data).returning();
  },
  updateOnDB: async data => {
    return db
      .update(T_Tournament)
      .set(data)
      .where(eq(T_Tournament.externalId, data.externalId))
      .returning();
  },
  standings: {
    fetch: async (url: string) => {
      const response = await axios.get(url);

      return response.data as API_GloboEsporteStandings;
    },
    parse: (data: API_GloboEsporteStandings) => ({
      teams: data.classificacao.map(team =>
        ProviderGloboEsporte.team.parseToStandings(team)
      ),
    }),
  },
  teams: {
    parseToDB: (standings: API_GloboEsporteStandings) => {
      return standings?.classificacao.map(ProviderGloboEsporte.team.parseToDB);
    },
    insertOnDB: async data => {
      return db.insert(T_Team).values(data).returning();
    },
  },
};
