import { ApiProviderSofascore } from './providers/sofascore';

export const ACTIVE_API_PROVIDER = process.env['API_PROVIDER'] || '';

export const ApiProvider = ApiProviderSofascore;
