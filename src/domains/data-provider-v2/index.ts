import { IApiProviderV2 } from './interface';
import { GloboEsporteTeams } from './providers/globo-esporte/globo-esporte-teams';
import { GloboEsporteTournament } from './providers/globo-esporte/globo-esporte-tournament';
import { SofascoreTeams } from './providers/sofascore/sofacore-teams';
import { SofascoreTournament } from './providers/sofascore/sofascore-tournament';

export const ApiProviderGloboEsporte = {
  tournament: GloboEsporteTournament,
  teams: GloboEsporteTeams,
} satisfies IApiProviderV2;

export const ApiProviderSofa = {
  tournament: SofascoreTournament,
  teams: SofascoreTeams,
} satisfies IApiProviderV2;
