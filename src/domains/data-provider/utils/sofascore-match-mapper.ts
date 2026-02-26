import type { DB_SelectMatch } from '@/domains/match/schema';
import type { API_SOFASCORE_MATCH } from '../typing';

type SofaScoreStatusType = API_SOFASCORE_MATCH['status']['type'] | null | undefined;
type SofaScoreScoreNode = Partial<API_SOFASCORE_MATCH['homeScore']> | null | undefined;

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const mapSofaScoreStatusTypeToMatchStatus = (statusType: SofaScoreStatusType): DB_SelectMatch['status'] => {
  if (statusType === 'finished') {
    return 'ended';
  }

  if (statusType === 'postponed') {
    return 'not-defined';
  }

  return 'open';
};

export const extractSofaScoreMainScore = (scoreNode: SofaScoreScoreNode): number | null => {
  const displayScore = parseNullableNumber(scoreNode?.display);
  if (displayScore !== null) {
    return displayScore;
  }

  return parseNullableNumber(scoreNode?.current);
};

export const extractSofaScorePenaltiesScore = (scoreNode: SofaScoreScoreNode): number | null => {
  return parseNullableNumber(scoreNode?.penalties);
};

export const mapSofaScoreEventToMatchPollingPayload = (event: API_SOFASCORE_MATCH) => {
  return {
    status: mapSofaScoreStatusTypeToMatchStatus(event.status?.type),
    homeScore: extractSofaScoreMainScore(event.homeScore),
    awayScore: extractSofaScoreMainScore(event.awayScore),
    homePenaltiesScore: extractSofaScorePenaltiesScore(event.homeScore),
    awayPenaltiesScore: extractSofaScorePenaltiesScore(event.awayScore),
  };
};
