import { IApiProvider } from '@/domains/data-providers/typing';
import { matchProvider } from './match';
import { roundsProvider } from './rounds';
import { teamProvider } from './team';
import { tournamentProvider } from './tournament';

export const ProviderGloboEsporte: IApiProvider = {
  tournament: tournamentProvider,
  rounds: roundsProvider,
  match: matchProvider,
  team: teamProvider,
};
