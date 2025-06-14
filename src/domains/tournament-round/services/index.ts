import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

const getAllRounds = async (
  tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
) => {
  return QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
};

export const SERVICES_TOURNAMENT_ROUND = {
  getAllRounds,
};
