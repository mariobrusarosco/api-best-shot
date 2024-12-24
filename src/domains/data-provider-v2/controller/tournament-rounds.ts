import { DB_SelectTournament } from '@/domains/tournament/schema';
import { SofascoreTournamentRounds } from '../providers/sofascore/sofascore-tournament-rounds';

const setup = async (tournament: DB_SelectTournament) => {
  // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
  const rounds = await SofascoreTournamentRounds.fetchRoundsFromProvider(
    tournament.baseUrl
  );
  const roundsToInsert = await SofascoreTournamentRounds.mapAvailableRounds(
    rounds,
    tournament
  );
  const roundsInserted = await SofascoreTournamentRounds.createOnDatabase(roundsToInsert);

  return roundsInserted;
};

const update = async (tournament: DB_SelectTournament) => {
  const rounds = await SofascoreTournamentRounds.fetchRoundsFromProvider(
    tournament.baseUrl
  );
  const roundsToUpdate = await SofascoreTournamentRounds.mapAvailableRounds(
    rounds,
    tournament
  );
  const roundsUpdated = await SofascoreTournamentRounds.updateOnDatabase(roundsToUpdate);

  return roundsUpdated;
};

export const TournamentRoundsController = {
  setup,
  update,
};
