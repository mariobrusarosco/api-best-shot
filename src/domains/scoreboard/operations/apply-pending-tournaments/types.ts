import type { QUERIES_GUESS } from '@/domains/guess/queries';
import type { IGuessAnalysis } from '@/domains/guess/typing';
import type { QUERIES_MATCH } from '@/domains/match/queries';

export type MatchAwaitingScoreboardCalculation = Awaited<
  ReturnType<typeof QUERIES_MATCH.listMatchesAwaitingScoreboardCalculationForTournament>
>[number];

export type GuessForEndedMatch = Awaited<ReturnType<typeof QUERIES_GUESS.listGuessesForEndedMatch>>[number];

export type ScoredEndedMatchGuess = GuessForEndedMatch & {
  guessAnalysis: IGuessAnalysis;
};

export type ProcessEndedMatchForScoreboardResult = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
};

export type FailedMatchScoreboardProcessing = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
  errorMessage: string;
};
