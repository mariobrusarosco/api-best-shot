import type db from '@/core/database';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import type { ScoredEndedMatchGuess } from './types';

type TournamentScoreboardExecutor = typeof db;

export const updateTournamentScoreboardFromEndedMatch = async (input: {
  scoredEndedMatchGuesses: ScoredEndedMatchGuess[];
  executor?: TournamentScoreboardExecutor;
}): Promise<void> => {
  if (input.scoredEndedMatchGuesses.length === 0) {
    return;
  }

  const tournamentId = input.scoredEndedMatchGuesses[0].match.tournamentId;
  const memberPointDeltas = new Map<string, number>();

  for (const row of input.scoredEndedMatchGuesses) {
    const currentPoints = memberPointDeltas.get(row.guess.memberId) ?? 0;
    memberPointDeltas.set(row.guess.memberId, currentPoints + (row.guessAnalysis.total ?? 0));
  }

  await QUERIES_TOURNAMENT.ensureTournamentScoreboardsExist(
    tournamentId,
    Array.from(memberPointDeltas.keys()),
    input.executor
  );

  await QUERIES_TOURNAMENT.bulkUpdateTournamentScoreboardPoints(tournamentId, memberPointDeltas, input.executor);
};
