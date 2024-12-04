import { IApiProviderV2 } from './interface';
import { SofascoreTournament } from './sofascore/sofascore-tournament';

export const ApiProvider = {
  tournament: SofascoreTournament,
} satisfies IApiProviderV2;
