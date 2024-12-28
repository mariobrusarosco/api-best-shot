import { SofascoreMatches } from '@/domains/data-provider/providers/sofascore/matches';
import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { DB_InsertMatch } from '@/domains/match/schema';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { TournamentQueries } from '@/domains/tournament/queries';
import { sleep } from '@/utils';

const create = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  // Get All Tournament Rounds
  const roundList = await TournamentRoundsQueries.getAllRounds(tournamentId);
  // Call the fetch round process to all rounds
  let matches: DB_InsertMatch[] = [];

  for (const round of roundList) {
    console.log('[LOG] - [START] - FETCHING ROUND:', round.providerUrl);
    await sleep(3000);

    const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
      round.providerUrl
    );

    const newMatches = SofascoreMatches.mapRoundMatches({
      roundSlug: round.slug!,
      round: roundData,
      tournamentId: tournamentId,
    });

    console.log('[LOG] - [END] - FETCHING ROUND:', round.providerUrl);

    matches = [...matches, ...newMatches];
  }

  const query = await SofascoreMatches.createOnDatabase(matches);

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  // Get All Tournament Rounds
  const roundList = await TournamentRoundsQueries.getAllRounds(tournamentId);
  let matches: DB_InsertMatch[] = [];

  for (const round of roundList) {
    console.log('[LOG] - [START] - FETCHING ROUND:', round.providerUrl);
    await sleep(3000);

    // Call the fetch round process to all rounds
    const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
      round.providerUrl
    );
    const newMatches = SofascoreMatches.mapRoundMatches({
      roundSlug: round.slug!,
      round: roundData,
      tournamentId: tournamentId,
    });

    console.log('[LOG] - [END] - FETCHING ROUND:', round.providerUrl);

    matches = [...matches, ...newMatches];
  }

  const query = await SofascoreMatches.upsertOnDatabase(matches);

  return query;
};

const updateRound = async (tournamentId: string, roundSlug: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const round = await TournamentRoundsQueries.getRound({
    tournamentId,
    roundSlug,
  });
  if (!round) throw new Error('Round not found');

  console.log('[LOG] - [START] - FETCHING ROUND:', round.providerUrl);

  const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
    round.providerUrl
  );
  const matches = SofascoreMatches.mapRoundMatches({
    roundSlug: round.slug!,
    round: roundData,
    tournamentId: tournamentId,
  });

  console.log('[LOG] - [END] - FETCHING ROUND:', round.providerUrl);

  const query = await SofascoreMatches.upsertOnDatabase(matches);

  return query;
};

export const MatchesController = {
  create,
  update,
  updateRound,
};
