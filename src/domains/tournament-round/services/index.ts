import { QUERIES_TOURNAMENT_ROUND } from '../queries';

const getAllRounds = async (tournamentId: string) => {
  return QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId);
};

export const SERVICES_TOURNAMENT_ROUND = {
  getAllRounds,
};
