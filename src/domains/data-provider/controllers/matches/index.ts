import { SofascoreMatches } from '@/domains/data-provider/providers/sofascore/matches';
import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { DB_InsertMatch } from '@/domains/match/schema';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { sleep } from '@/utils';

const create = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const roundList = await TournamentRoundsQueries.getAllRounds(tournamentId);
  let matches: DB_InsertMatch[] = [];

  for (const round of roundList) {
    Profiling.log({
      msg: '[LOG] - [DATA PROVIDER] - FETCHING ROUND:',
      data: round.providerUrl,
      color: 'FgBlue'
    });
    await sleep(3000);

    const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
      round.providerUrl
    );

    const newMatches = SofascoreMatches.mapRoundMatches({
      roundSlug: round.slug!,
      round: roundData,
      tournamentId: tournamentId,
    });

    matches = [...matches, ...newMatches];
  }

  const query = await SofascoreMatches.createOnDatabase(matches);

  Profiling.log({
    msg: '[DATA PROVIDER] - [MATCHES] - [CREATE ALL MACTHES]',
    data: { matches },
    color: 'FgGreen'
  });

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
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

    matches = [...matches, ...newMatches];
  }

  const query = await SofascoreMatches.upsertOnDatabase(matches);

  Profiling.log({
    msg: '[DATA PROVIDER] - [MATCHES] - [UPDATE ALL MACTHES]',
    data: { matches },
    color: 'FgGreen'
  });

  return query;
};

const updateRound = async (tournamentId: string, roundSlug: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const round = await TournamentRoundsQueries.getRound({
    tournamentId,
    roundSlug,
  });
  if (!round) throw new Error('Round not found');

  const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
    round.providerUrl
  );
  const matches = SofascoreMatches.mapRoundMatches({
    roundSlug: round.slug!,
    round: roundData,
    tournamentId: tournamentId,
  });

  const query = await SofascoreMatches.upsertOnDatabase(matches);
  Profiling.log({
    msg: '[DATA PROVIDER] - [MATCHES] - [UPDATE MACTHES OF A ROUND]',
    data: { matches, round },
    color: 'FgGreen'
  });
  return query;
};

export const MatchesController = {
  create,
  update,
  updateRound,
};
