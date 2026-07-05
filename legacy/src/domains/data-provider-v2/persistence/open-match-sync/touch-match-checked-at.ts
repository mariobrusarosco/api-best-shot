import type {
  OpenMatchCheckedAtTouchInput,
  OpenMatchSyncCheckedMatch,
} from '@/domains/data-provider-v2/contracts/open-match-sync';
import { QUERIES_MATCH } from '@/domains/match/queries';

export const touchMatchCheckedAt = async (
  input: OpenMatchCheckedAtTouchInput
): Promise<OpenMatchSyncCheckedMatch | null> => {
  const updatedMatch = await QUERIES_MATCH.touchMatchCheckedAt(input.matchId, input.checkedAt);

  if (!updatedMatch) return null;

  return {
    id: updatedMatch.id,
    externalId: updatedMatch.externalId,
    status: updatedMatch.status,
    checkedAt: updatedMatch.lastCheckedAt,
  };
};
