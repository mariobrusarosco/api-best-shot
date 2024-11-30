import axios from 'axios';
import { IApiProvider } from '../typing';
import { GLOBO_ESPORTE_MATCHES_API, GloboEsporteApiMatch } from './typing';

export const roundsProvider: IApiProvider['rounds'] = {
  prepareUrl: ({ externalId, mode, round, slug }) => {
    return GLOBO_ESPORTE_MATCHES_API.replace(':external_id', externalId)
      .replace(':mode', mode)
      .replace(':slug', slug)
      .replace(':round', String(round));
  },
  fetchRound: async (url: string) => {
    const response = await axios.get(url);

    return response.data as GloboEsporteApiMatch[];
  },
};
