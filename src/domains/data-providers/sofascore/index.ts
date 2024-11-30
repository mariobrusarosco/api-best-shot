import { IApiProvider } from '../typing';
import { matchProvider } from './match';
import { roundsProvider } from './rounds';
import { teamProvider } from './team';
import { tournamentProvider } from './tournament';

export const ProviderSofa: IApiProvider = {
  tournament: tournamentProvider,
  rounds: roundsProvider,
  match: matchProvider,
  team: teamProvider,
};
