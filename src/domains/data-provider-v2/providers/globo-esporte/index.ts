//@ts-nocheck
import { IApiProviderV2 } from '../../interface';
import { GloboEsporteTournament } from './globo-esporte-tournament';

export const ApiProviderGloboEsporte = {
  tournament: GloboEsporteTournament,
  // teams: GloboEsporteTeams,
  // matches: GloboEsporteMatches,
  // standings: SofascoreStandings,
} satisfies IApiProviderV2;
