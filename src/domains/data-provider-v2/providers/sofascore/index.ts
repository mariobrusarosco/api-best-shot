import { IApiProviderV2 } from '../../interface';
import { SofascoreTeams } from './sofacore-teams';
import { SofascoreMatches } from './sofascore-matches';
import { SofascoreTournament } from './sofascore-tournament';

export const ApiProviderSofascore = {
  tournament: SofascoreTournament,
  teams: SofascoreTeams,
  matches: SofascoreMatches,
} satisfies IApiProviderV2;
