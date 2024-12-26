import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { TournamentQueries } from '@/domains/tournament/queries';

const create = async (tournamentId: string) => {
  // const schedule = await Scheduler.tournamentUpdateRecurrence(tournament);
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  console.log('[LOG] - CREATING TOURNAMENT ROUNDS FOR: ', tournament.label);

  const shallowListOfRounds =
    await SofascoreTournamentRound.fetchShallowListOfRoundsFromProvider(
      tournament.baseUrl
    );
  const roundsToInsert = await SofascoreTournamentRound.mapShallowListOfRounds(
    shallowListOfRounds,
    tournament!
  );
  const roundsInserted = await SofascoreTournamentRound.createOnDatabase(roundsToInsert);

  console.log('[LOG] - CREATED TOURNAMENT ROUNDS FOR: ', tournament.label);
  return roundsInserted;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  console.log(
    '[LOG] - [TournamentRoundController] - UPDATING TOURNAMENT ROUNDS FOR: ',
    tournament.label
  );

  const rounds = await SofascoreTournamentRound.fetchShallowListOfRoundsFromProvider(
    tournament.baseUrl
  );
  const roundsToUpdate = await SofascoreTournamentRound.mapShallowListOfRounds(
    rounds,
    tournament
  );
  const roundsUpdated = await SofascoreTournamentRound.upsertOnDatabase(roundsToUpdate);

  return roundsUpdated;
};

const getRoundProviderData = async (tournamentId: string, roundSlug: string) => {
  const roundQuery = await TournamentRoundsQueries.getRound({ tournamentId, roundSlug });
  if (roundQuery === undefined)
    throw new Error('Tournament does not have a record for this round');

  return await SofascoreTournamentRound.fetchRoundFromProvider(roundQuery.providerUrl);
};

export const TournamentRoundController = {
  create,
  update,
  getRoundProviderData,
};
