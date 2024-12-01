import { ProviderGloboEsporte } from './globo-esporte';
import { ProviderSofa } from './sofascore';
import { IApiProvider } from './typing';

export const ACTIVE_PROVIDER = process.env['API_PROVIDER'] || '';

const API_PROVIDERS: { [key: string]: IApiProvider } = {
  ge: ProviderGloboEsporte,
  sofa: ProviderSofa,
};

export const ApiProvider = API_PROVIDERS[ACTIVE_PROVIDER as keyof typeof API_PROVIDERS];
