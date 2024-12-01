import axios from 'axios';
import { IApiProvider } from '../typing';
import { API_SofaScoreMatch, SOFA_MATCHES_URL } from './typing';

export const roundsProvider: IApiProvider['rounds'] = {
  createUrl: ({ externalId, mode, round, season }) => {
    return SOFA_MATCHES_URL.replace(':external_id', externalId)
      .replace(':mode', mode)
      .replace(':season', season)
      .replace(':round', String(round));
  },
  fetch: async (url: string) => {
    const response = await axios.get(url);

    return response.data?.events as API_SofaScoreMatch[];
  },
};
