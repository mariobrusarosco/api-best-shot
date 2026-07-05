// Match domain services
import { QUERIES_MATCH } from '../queries';

const getMatchesByTournament = async (tournamentId: string, roundId: string) => {
  return QUERIES_MATCH.getMatchesByTournament(tournamentId, roundId);
};

export const SERVICES_MATCH = {
  getMatchesByTournament,
};
