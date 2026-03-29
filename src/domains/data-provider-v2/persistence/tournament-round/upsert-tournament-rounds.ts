import type { DiscoveredProviderRound } from '@/domains/data-provider-v2/contracts/rounds';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';

export const upsertTournamentRounds = async (input: { rounds: DiscoveredProviderRound[] }) => {
  if (input.rounds.length === 0) {
    return [];
  }

  return QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(input.rounds);
};
