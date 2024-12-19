import { IApiProviderV2 } from '../../interface';
import { SofascoreStandings } from '../sofascore/sofascore-standings';
import { GloboEsporteMatches } from './globo-esporte-matches';
import { GloboEsporteTeams } from './globo-esporte-teams';
import { GloboEsporteTournament } from './globo-esporte-tournament';

export const ApiProviderGloboEsporte = {
  tournament: GloboEsporteTournament,
  teams: GloboEsporteTeams,
  matches: GloboEsporteMatches,
  standings: SofascoreStandings,
} satisfies IApiProviderV2;
