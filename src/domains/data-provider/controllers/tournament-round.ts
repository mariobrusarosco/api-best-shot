import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { TournamentQueries } from '@/domains/tournament/queries';

const create = async (tournamentId: string) => {
  // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  console.log(
    '[LOG] - [API_TournamentRounds] - CREATING TOURNAMENT ROUNDS FOR: ',
    tournament.label
  );

  const rounds = await SofascoreTournamentRound.fetchRoundsFromProvider(
    tournament.baseUrl
  );
  const roundsToInsert = await SofascoreTournamentRound.mapAvailableRounds(
    rounds,
    tournament!
  );

  const roundsInserted = await SofascoreTournamentRound.createOnDatabase(roundsToInsert);

  return roundsInserted;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  console.log(
    '[LOG] - [API_TournamentRounds] - UPDATING TOURNAMENT ROUNDS FOR: ',
    tournament.label
  );

  const rounds = await SofascoreTournamentRound.fetchRoundsFromProvider(
    tournament.baseUrl
  );
  const roundsToUpdate = await SofascoreTournamentRound.mapAvailableRounds(
    rounds,
    tournament
  );
  const roundsUpdated = await SofascoreTournamentRound.upsertOnDatabase(roundsToUpdate);

  return roundsUpdated;
};

export const TournamentRoundController = {
  create,
  update,
};
