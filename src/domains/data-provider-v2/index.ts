import { ApiProviderGloboEsporte } from './providers/globo-esporte';
import { ApiProviderSofascore } from './providers/sofascore';

export const ACTIVE_API_PROVIDER = process.env['API_PROVIDER'] || '';

export const ApiProvider =
  {
    ge: ApiProviderGloboEsporte,
    sofa: ApiProviderSofascore,
  }[ACTIVE_API_PROVIDER] || ApiProviderSofascore;
