import type {
  OpenMatchPollingUpdateInput,
  OpenMatchSyncUpdatedMatch,
} from '@/domains/data-provider-v2/contracts/open-match-sync';
import { QUERIES_MATCH } from '@/domains/match/queries';

export const updateMatchFromPolling = async (
  input: OpenMatchPollingUpdateInput
): Promise<OpenMatchSyncUpdatedMatch | null> => {
  const updatedMatch = await QUERIES_MATCH.updateMatchFromPolling({
    matchId: input.matchId,
    status: input.status,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    homePenaltiesScore: input.homePenaltiesScore,
    awayPenaltiesScore: input.awayPenaltiesScore,
    checkedAt: input.checkedAt,
  });

  if (!updatedMatch) return null;

  return {
    id: updatedMatch.id,
    externalId: updatedMatch.externalId,
    status: updatedMatch.status,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    homePenaltiesScore: updatedMatch.homePenaltiesScore,
    awayPenaltiesScore: updatedMatch.awayPenaltiesScore,
    checkedAt: updatedMatch.lastCheckedAt,
  };
};
