import axios from 'axios';
import { IApiProvider } from '../typing';
import { SOFA_MATCHES_API, SofaScoreMatchApi } from './typing';

export const roundsProvider: IApiProvider['rounds'] = {
  prepareUrl: ({ externalId, mode, round, season }) => {
    return SOFA_MATCHES_API.replace(':external_id', externalId)
      .replace(':mode', mode)
      .replace(':season', season)
      .replace(':round', String(round));
  },
  fetchRound: async (url: string) => {
    const response = await axios.get(url);

    return response.data?.events as SofaScoreMatchApi[];
  },
};
