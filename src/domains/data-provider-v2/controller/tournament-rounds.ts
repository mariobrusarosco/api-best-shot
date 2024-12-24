import { DB_SelectTournament } from '@/domains/tournament/schema';

const setup = async (tournament: DB_SelectTournament) => {
  // CREATE TOURNAMENT ROUNDS
  // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
  // const rounds = await SofascoreTournamentRounds.fetchRounds(tournament.baseUrl);
  // const roundsToInsert = SofascoreTournamentRounds.mapRoundsToInsert(
  //   rounds,
  //   tournament.id!
  // );
  // const roundsInserted = await SofascoreTournamentRounds.createRoundsOnDatabase(
  //   roundsToInsert
  // );
  // console.log('ROUNDS', roundsInserted);
  // return roundsInserted;
};

export const TournamentRoundsController = {
  setup,
};
