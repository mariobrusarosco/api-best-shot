import { QUERIES_MATCH } from '@/domains/match/queries';

export type MatchAwaitingScoreboardCalculation = Awaited<
  ReturnType<typeof QUERIES_MATCH.listMatchesAwaitingScoreboardCalculationForTournament>
>[number];

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
