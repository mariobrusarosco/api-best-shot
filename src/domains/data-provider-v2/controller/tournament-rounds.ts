import { DB_SelectTournament } from '@/domains/tournament/schema';
import { SofascoreTournamentRounds } from '../providers/sofascore/sofascore-tournament-rounds';

const setup = async (tournament: DB_SelectTournament) => {
  // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
  const rounds = await SofascoreTournamentRounds.fetchAvailableRounds(tournament.baseUrl);
  const roundsToInsert = await SofascoreTournamentRounds.mapAvailableRounds(
    rounds,
    tournament.id!
  );
  const roundsInserted = await SofascoreTournamentRounds.createOnDatabase(roundsToInsert);

  console.log('ROUNDS', roundsInserted);
  return rounds;
};

const update = async (tournament: DB_SelectTournament) => {};

export const TournamentRoundsController = {
  setup,
  update,
};
