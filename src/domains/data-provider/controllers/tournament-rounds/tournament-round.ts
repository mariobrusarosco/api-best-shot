import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { MatchesController } from '../matches';

const create = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  Profiling.log({
    msg: 'CREATING TOURNAMENT ROUNDS FOR: ',
    data: tournament.label,
    color: 'FgBlue'
  });

  const shallowListOfRounds =
    await SofascoreTournamentRound.fetchShallowListOfRoundsFromProvider(
      tournament.baseUrl
    );
  const roundsToInsert = await SofascoreTournamentRound.mapShallowListOfRounds(
    shallowListOfRounds,
    tournament!
  );
  const roundsInserted = await SofascoreTournamentRound.createOnDatabase(roundsToInsert);

  Profiling.log({
    msg: '[LOG] - [DATA PROVIDER] - CREATED TOURNAMENT ROUNDS FOR: ',
    data: tournament.label,
    color: 'FgGreen'
  });
  return roundsInserted;
};

const update = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  Profiling.log({
    msg: '[LOG] - [DATA PROVIDER] - UPDATING TOURNAMENT ROUNDS FOR: ',
    data: tournament.label,
    color: 'FgBlue'
  });

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

const knockoutRoundsUpdate = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (tournament === undefined) throw new Error('Tournament not found');

  Profiling.log({
    msg: '[LOG] - [DATA PROVIDER] - [START] - UPDATING KNOCKOUT ROUNDS FOR: ',
    data: tournament.label,
    color: 'FgBlue'
  });

  const listOfRoundsFromDataProvider =
    await SofascoreTournamentRound.mapShallowListOfRounds(
      await SofascoreTournamentRound.fetchShallowListOfRoundsFromProvider(
        tournament.baseUrl
      ),
      tournament
    );
  const listOfRoundsFromDatabase = await TournamentRoundsQueries.getAllRounds(
    tournamentId
  );

  const newDetectedRounds = listOfRoundsFromDataProvider.filter(round => {
    return !listOfRoundsFromDatabase.find(
      currentRound => currentRound.slug === round.slug
    );
  });

  await SofascoreTournamentRound.upsertOnDatabase(newDetectedRounds);

  for (const newRound of newDetectedRounds) {
    await MatchesController.updateRound(tournamentId, newRound.slug!);
  }

  return { newDetectedRounds };
};

export const TournamentRoundController = {
  create,
  update,
  getRoundProviderData,
  knockoutRoundsUpdate,
};
