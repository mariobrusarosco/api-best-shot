import { TTournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { ProviderSofa } from '.';
import { IApiProvider } from '../typing';
import { SOFA_TOURNAMENT_API, SofaScorestandings, SofaScorestandingsApi } from './typing';

export const tournamentProvider: IApiProvider['tournament'] = {
  prepareUrl: ({ externalId }) => SOFA_TOURNAMENT_API.replace(':external_id', externalId),
  createOnDB: async data => {
    return db.insert(TTournament).values(data).returning();
  },
  updateOnDB: async data => {
    return db
      .update(TTournament)
      .set(data)
      .where(eq(TTournament.externalId, data.externalId))
      .returning();
  },
  fetchStandings: async (url: string) => {
    const response = await axios.get(url);
    const data = response.data as SofaScorestandingsApi;

    return data.standings[0] as SofaScorestandingsApi['standings'][number];
  },
  parseStandings: (standings: SofaScorestandings['standings'][number]) => {
    const teams = standings?.rows.map(ProviderSofa.team.parse);

    return { teams };
  },
};
