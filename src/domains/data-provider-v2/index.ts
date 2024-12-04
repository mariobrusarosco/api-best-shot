import { IApiProviderV2 } from './interface';
import { GloboEsportTeams } from './providers/globo-esporte/globo-esporte-teams';
import { GloboEsportTournament } from './providers/globo-esporte/globo-esporte-tournament';

export const ApiProviderV2 = {
  tournament: GloboEsportTournament,
  teams: GloboEsportTeams,
} satisfies IApiProviderV2;
