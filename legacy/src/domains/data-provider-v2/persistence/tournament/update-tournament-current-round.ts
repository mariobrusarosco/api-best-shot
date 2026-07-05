import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';

export const updateTournamentCurrentRound = async (input: { tournamentId: string; currentRound: string }) => {
  return QUERIES_TOURNAMENT.updateTournamentCurrentRound(input.tournamentId, input.currentRound);
};
