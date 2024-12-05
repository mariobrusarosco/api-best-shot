import { IApiProviderV2 } from './interface';
import { GloboEsporteMatches } from './providers/globo-esporte/globo-esport-matches';
import { GloboEsporteTeams } from './providers/globo-esporte/globo-esporte-teams';
import { GloboEsporteTournament } from './providers/globo-esporte/globo-esporte-tournament';
import { SofascoreTeams } from './providers/sofascore/sofacore-teams';
import { SofascoreMatches } from './providers/sofascore/sofascore-matches';
import { SofascoreTournament } from './providers/sofascore/sofascore-tournament';

export const ApiProviderGloboEsporte = {
  tournament: GloboEsporteTournament,
  teams: GloboEsporteTeams,
  matches: GloboEsporteMatches,
} satisfies IApiProviderV2;

export const ApiProviderSofascore = {
  tournament: SofascoreTournament,
  teams: SofascoreTeams,
  matches: SofascoreMatches,
} satisfies IApiProviderV2;
