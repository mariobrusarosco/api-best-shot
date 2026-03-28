import { QUERIES_MATCH } from '@/domains/match/queries';

export type MatchAwaitingScoreboardCalculation = Awaited<
  ReturnType<typeof QUERIES_MATCH.listMatchesAwaitingScoreboardCalculationForTournament>
>[number];

export type ProcessMatchAwaitingScoreboardCalculationResult = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
};
