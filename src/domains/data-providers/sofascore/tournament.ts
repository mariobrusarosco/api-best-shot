import { DB_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { ProviderSofa } from '.';
import { IApiProvider } from '../typing';
import { API_SofaScorestandings, SOFA_TOURNAMENT_URL } from './typing';

export const tournamentProvider: IApiProvider['tournament'] = {
  createUrl: ({ externalId }) => SOFA_TOURNAMENT_URL.replace(':external_id', externalId),
  createOnDB: async data => {
    return db.insert(DB_Tournament).values(data).returning();
  },
  updateOnDB: async data => {
    return db
      .update(DB_Tournament)
      .set(data)
      .where(eq(DB_Tournament.externalId, data.externalId))
      .returning();
  },
  standings: {
    fetch: async (url: string) => {
      const response = await axios.get(url);
      const data = response.data as API_SofaScorestandings;

      return data.standings[0] as API_SofaScorestandings['standings'][number];
    },
    parse: (standings: API_SofaScorestandings['standings'][number]) => {
      const teams = standings?.rows.map(ProviderSofa.team.parseToStandings);

      return { teams };
    },
  },
};
