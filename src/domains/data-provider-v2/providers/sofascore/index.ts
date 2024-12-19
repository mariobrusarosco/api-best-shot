import { IApiProviderV2 } from '../../interface';
import { SofascoreTeams } from './sofacore-teams';
import { SofascoreMatches } from './sofascore-matches';
import { SofascoreStandings } from './sofascore-standings';
import { SofascoreTournament } from './sofascore-tournament';

export const ApiProviderSofascore = {
  tournament: SofascoreTournament,
  teams: SofascoreTeams,
  matches: SofascoreMatches,
  standings: SofascoreStandings,
} satisfies IApiProviderV2;
