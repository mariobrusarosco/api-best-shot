import { T_Team } from '@/domains/team/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { ProviderSofa } from '.';
import { IApiProvider } from '../typing';
import { API_SofaScoreStandings, SOFA_TOURNAMENT_URL } from './typing';

export const tournamentProvider: IApiProvider['tournament'] = {
  createUrl: data =>
    SOFA_TOURNAMENT_URL.replace(':external_id', data.externalId)
      .replace(':mode', data.mode)
      .replace(':season', data.season),
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
      const data = response.data as API_SofaScoreStandings;

      return data.standings[0] as API_SofaScoreStandings['standings'][number];
    },
    parse: (standings: API_SofaScoreStandings['standings'][number]) => {
      const teams = standings?.rows.map(ProviderSofa.team.parseToStandings);

      return { teams };
    },
  },
  teams: {
    parseToDB: (standings: API_SofaScoreStandings['standings'][number]) => {
      return standings?.rows.map(ProviderSofa.team.parseToDB);
    },
    insertOnDB: async data => {
      return db.insert(T_Team).values(data).returning();
    },
  },
};
