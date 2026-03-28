import db from '@/core/database';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import type { DB_SelectScoreboardLedger } from '@/domains/scoreboard/schema';
import type { ScoredEndedMatchGuess } from './types';

type ScoreboardLedgerExecutor = typeof db;

export const insertEndedMatchScoreboardLedger = async (input: {
  scoredEndedMatchGuesses: ScoredEndedMatchGuess[];
  ruleVersion?: number;
  executor?: ScoreboardLedgerExecutor;
}): Promise<DB_SelectScoreboardLedger[]> => {
  const ruleVersion = input.ruleVersion ?? 1;
  const ledgerEntries = input.scoredEndedMatchGuesses.map(row => ({
    matchId: row.match.id,
    tournamentId: row.match.tournamentId,
    memberId: row.guess.memberId,
    guessId: row.guess.id,
    pointsEarned: row.guessAnalysis.total ?? 0,
    ruleVersion,
  }));

  return QUERIES_SCOREBOARD.insertLedgerEntriesConflictSafe(ledgerEntries, input.executor);
};
