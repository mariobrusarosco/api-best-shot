import { ProviderGloboEsporte } from './globo-esporte/api-mapper';
import { ProviderSofa } from './sofascore/api-mapper';
import { IApiProvider } from './typing';

const ACTIVE_PROVIDER = process.env['API_PROVIDER'] as keyof typeof API_PROVIDERS;

const API_PROVIDERS: { [key: string]: IApiProvider } = {
  ge: ProviderGloboEsporte,
  sofa: ProviderSofa,
};

export const ApiProvider = API_PROVIDERS[ACTIVE_PROVIDER];
