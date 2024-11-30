import { TTournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { ProviderSofa } from '.';
import { IApiProvider } from '../typing';
import { SOFA_TOURNAMENT_API, SofaScorestandings } from './typing';

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

    return response.data as SofaScorestandings;
  },
  parseStandings: (data: SofaScorestandings) =>
    data.standings[0]['rows']?.map(team => ProviderSofa.team.parseFromStandings(team)),
};
