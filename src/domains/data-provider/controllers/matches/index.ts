import { SofascoreMatches } from '@/domains/data-provider/providers/sofascore/matches';
import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { DB_InsertMatch } from '@/domains/match/schema';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { TournamentQueries } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { sleep } from '@/utils';

const create = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const roundList = await TournamentRoundsQueries.getAllRounds(tournamentId);
  let matches: DB_InsertMatch[] = [];

  for (const round of roundList) {
    Profiling.log('[LOG] - [DATA PROVIDER] - FETCHING ROUND:', round.providerUrl);
    await sleep(3000);

    const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
      round.providerUrl
    );

    const newMatches = SofascoreMatches.mapRoundMatches({
      roundSlug: round.slug!,
      round: roundData,
      tournamentId: tournamentId,
    });

    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [CREATE ALL MACTHES] - FETCHED ROUND:',
      round.providerUrl
    );

    matches = [...matches, ...newMatches];
  }

  const query = await SofascoreMatches.createOnDatabase(matches);

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const roundList = await TournamentRoundsQueries.getAllRounds(tournamentId);
  let matches: DB_InsertMatch[] = [];

  for (const round of roundList) {
    console.log(
      '[LOG] - [DATA PROVIDER] - [UPDATE] - FETCHING ROUND:',
      round.providerUrl
    );
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

    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [UPDATE ALL MATCHES] - FETCHED ROUND:',
      round.providerUrl
    );

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

  console.log(
    '[LOG] - [DATA PROVIDER] - [UPDATE UNIQUE ROUND MATCHES] - FETCHING ROUND:',
    round.providerUrl
  );

  const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
    round.providerUrl
  );
  const matches = SofascoreMatches.mapRoundMatches({
    roundSlug: round.slug!,
    round: roundData,
    tournamentId: tournamentId,
  });

  Profiling.log(
    '[LOG] - [DATA PROVIDER] - [UPDATE UNIQUE ROUND MATCHES] - FETCHED ROUND:',
    round.providerUrl
  );

  const query = await SofascoreMatches.upsertOnDatabase(matches);

  return query;
};

export const MatchesController = {
  create,
  update,
  updateRound,
};
