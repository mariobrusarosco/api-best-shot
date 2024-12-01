import axios from 'axios';
import { IApiProvider } from '../typing';
import { API_GloboEsporteMatch, GLOBO_ESPORTE_MATCHES_URL } from './typing/api';

export const roundsProvider: IApiProvider['rounds'] = {
  createUrl: ({ externalId, mode, round, slug }) => {
    return GLOBO_ESPORTE_MATCHES_URL.replace(':external_id', externalId)
      .replace(':mode', mode)
      .replace(':slug', slug)
      .replace(':round', String(round));
  },
  fetch: async (url: string) => {
    const response = await axios.get(url);

    return response.data as API_GloboEsporteMatch[];
  },
};
