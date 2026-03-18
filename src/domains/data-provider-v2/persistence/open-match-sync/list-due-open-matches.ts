import { QUERIES_MATCH } from '@/domains/match/queries';
import type { OpenMatchSyncDueMatch } from '@/domains/data-provider-v2/contracts/open-match-sync';

export const listDueOpenMatches = async (params: { now: Date; limit: number }): Promise<OpenMatchSyncDueMatch[]> => {
  const matches = await QUERIES_MATCH.listDueOpenMatchesForPolling({
    now: params.now,
    limit: params.limit,
  });

  return matches.map(match => ({
    id: match.id,
    externalId: match.externalId,
    provider: match.provider,
    status: match.status,
    date: match.date,
    tournamentId: match.tournamentId,
    roundSlug: match.roundSlug,
  }));
};
