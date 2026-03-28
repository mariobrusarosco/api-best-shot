import { QUERIES_MATCH } from '@/domains/match/queries';

export type PendingScoreboardMatch = Awaited<
  ReturnType<typeof QUERIES_MATCH.listPendingScoreboardMatchesForTournament>
>[number];

export type ProcessPendingScoreboardMatchResult = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
};
