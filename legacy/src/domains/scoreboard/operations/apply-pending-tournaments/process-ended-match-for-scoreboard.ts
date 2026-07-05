import db from '@/core/database';
import { QUERIES_MATCH } from '@/domains/match/queries';
import type { MatchAwaitingScoreboardCalculation, ProcessEndedMatchForScoreboardResult } from './types';
import { insertEndedMatchScoreboardLedger } from './insert-ended-match-scoreboard-ledger';
import { scoreEndedMatchGuesses } from './score-ended-match-guesses';
import { updateTournamentScoreboardFromEndedMatch } from './update-tournament-scoreboard-from-ended-match';

export const processEndedMatchForScoreboard = async (
  match: MatchAwaitingScoreboardCalculation
): Promise<ProcessEndedMatchForScoreboardResult> => {
  const scoredEndedMatchGuesses = await scoreEndedMatchGuesses(match.id);
  const scoreboardAppliedAt = new Date();

  await db.transaction(async tx => {
    const transaction = tx as typeof db;

    await insertEndedMatchScoreboardLedger({
      scoredEndedMatchGuesses,
      executor: transaction,
    });

    await updateTournamentScoreboardFromEndedMatch({
      scoredEndedMatchGuesses,
      executor: transaction,
    });

    const updatedMatch = await QUERIES_MATCH.markMatchScoreboardApplied(match.id, scoreboardAppliedAt, transaction);

    if (!updatedMatch) {
      throw new Error(`Failed to mark match ${match.id} as scoreboard applied`);
    }
  });

  return {
    matchId: match.id,
    externalId: match.externalId ?? undefined,
    roundSlug: match.roundSlug ?? undefined,
  };
};
