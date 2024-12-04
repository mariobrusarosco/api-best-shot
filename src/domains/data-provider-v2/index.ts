import { IApiProviderV2 } from './interface';
import { SofascoreTournament } from './sofascore/sofascore-tournament';

export const ApiProviderV2 = {
  tournament: SofascoreTournament,
} satisfies IApiProviderV2;
