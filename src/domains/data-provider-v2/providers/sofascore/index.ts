import { IApiProviderV2 } from '../../interface';
import { SofascoreTeams } from './sofacore-teams';
import { SofascoreTournament } from './sofascore-tournament';

export const ApiProviderSofascore = {
  tournament: SofascoreTournament,
  teams: SofascoreTeams,
  // matches: SofascoreMatches,
  // standings: SofascoreStandings,
} satisfies IApiProviderV2;
