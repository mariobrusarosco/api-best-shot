import { IApiProviderV2 } from '../../interface';
import { GloboEsporteMatches } from './globo-esport-matches';
import { GloboEsporteTeams } from './globo-esporte-teams';
import { GloboEsporteTournament } from './globo-esporte-tournament';

export const ApiProviderGloboEsporte = {
  tournament: GloboEsporteTournament,
  teams: GloboEsporteTeams,
  matches: GloboEsporteMatches,
} satisfies IApiProviderV2;
