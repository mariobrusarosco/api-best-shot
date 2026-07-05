import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type { OpenMatchPollingUpdateInput } from '@/domains/data-provider-v2/contracts/open-match-sync';
import type { OpenMatchSyncOutcome } from '@/domains/data-provider-v2/contracts/open-match-sync';
import type {
  SofaScoreMatchEvent,
  SofaScoreMatchEventPayload,
} from '@/domains/data-provider-v2/providers/sofascore/match-provider';
import type { DB_SelectMatch } from '@/domains/match/schema';

type MappedMatchStatus = DB_SelectMatch['status'];
type SofaScoreStatusType = SofaScoreMatchEvent['status']['type'] | null | undefined;
type SofaScoreScoreNode = Partial<SofaScoreMatchEvent['homeScore']> | null | undefined;

export type OpenMatchSyncClassification =
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'updated'>;
      providerStatus: MappedMatchStatus;
      pollingUpdate: Omit<OpenMatchPollingUpdateInput, 'matchId'>;
    }
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'provider_status_not_ended'>;
      providerStatus: MappedMatchStatus;
    }
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'provider_status_postponed'>;
      providerStatus: MappedMatchStatus;
      pollingUpdate: Omit<OpenMatchPollingUpdateInput, 'matchId'>;
    }
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'provider_response_missing_event'>;
    }
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'provider_match_not_found'>;
      errorMessage: string;
      requestUrl: string;
      causeMessage?: string;
      responseBodySnippet?: string;
    }
  | {
      outcome: Extract<OpenMatchSyncOutcome, 'unexpected_failure'>;
      errorMessage: string;
      requestUrl?: string;
      causeMessage?: string;
      responseBodySnippet?: string;
    };

export const classifyMatchSyncOutcome = (
  input:
    | {
        checkedAt: Date;
        payload: SofaScoreMatchEventPayload;
      }
    | {
        error: unknown;
      }
): OpenMatchSyncClassification => {
  if ('error' in input) {
    return classifyMatchSyncError(input.error);
  }

  const event = input.payload.event;

  if (!event) {
    return {
      outcome: 'provider_response_missing_event',
    };
  }

  const providerStatus = mapSofaScoreStatusTypeToMatchStatus(event.status?.type);

  if (providerStatus === 'postponed') {
    return {
      outcome: 'provider_status_postponed',
      providerStatus,
      pollingUpdate: {
        status: providerStatus,
        homeScore: extractSofaScoreMainScore(event.homeScore),
        awayScore: extractSofaScoreMainScore(event.awayScore),
        homePenaltiesScore: extractSofaScorePenaltiesScore(event.homeScore),
        awayPenaltiesScore: extractSofaScorePenaltiesScore(event.awayScore),
        checkedAt: input.checkedAt,
      },
    };
  }

  if (providerStatus !== 'ended') {
    return {
      outcome: 'provider_status_not_ended',
      providerStatus,
    };
  }

  return {
    outcome: 'updated',
    providerStatus,
    pollingUpdate: {
      status: providerStatus,
      homeScore: extractSofaScoreMainScore(event.homeScore),
      awayScore: extractSofaScoreMainScore(event.awayScore),
      homePenaltiesScore: extractSofaScorePenaltiesScore(event.homeScore),
      awayPenaltiesScore: extractSofaScorePenaltiesScore(event.awayScore),
      checkedAt: input.checkedAt,
    },
  };
};

const classifyMatchSyncError = (error: unknown): OpenMatchSyncClassification => {
  if (error instanceof ProviderRequestError) {
    if (error.status === 404) {
      return {
        outcome: 'provider_match_not_found',
        errorMessage: error.message,
        requestUrl: error.requestUrl,
        causeMessage: error.causeMessage,
        responseBodySnippet: error.responseBodySnippet,
      };
    }

    return {
      outcome: 'unexpected_failure',
      errorMessage: error.message,
      requestUrl: error.requestUrl,
      causeMessage: error.causeMessage,
      responseBodySnippet: error.responseBodySnippet,
    };
  }

  return {
    outcome: 'unexpected_failure',
    errorMessage: error instanceof Error ? error.message : String(error),
  };
};

const mapSofaScoreStatusTypeToMatchStatus = (statusType: SofaScoreStatusType): MappedMatchStatus => {
  if (statusType === 'finished') {
    return 'ended';
  }

  if (statusType === 'postponed') {
    return 'postponed';
  }

  return 'open';
};

const extractSofaScoreMainScore = (scoreNode: SofaScoreScoreNode): number | null => {
  const displayScore = parseNullableNumber(scoreNode?.display);

  if (displayScore !== null) {
    return displayScore;
  }

  return parseNullableNumber(scoreNode?.current);
};

const extractSofaScorePenaltiesScore = (scoreNode: SofaScoreScoreNode): number | null => {
  return parseNullableNumber(scoreNode?.penalties);
};

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
