import type {
  DiscoveredProviderMatch,
  MatchesInvalidProviderMatch,
  MatchesRoundContext,
  SofaScoreMatchScoreNode,
  SofaScoreRoundMatchEvent,
  SofaScoreRoundMatchesPayload,
} from '@/domains/data-provider-v2/contracts/matches';
import type { DB_SelectMatch } from '@/domains/match/schema';

export const mapRoundProviderMatches = (input: {
  tournamentId: string;
  round: MatchesRoundContext;
  payload: SofaScoreRoundMatchesPayload;
}): {
  matches: DiscoveredProviderMatch[];
  invalidProviderMatches: MatchesInvalidProviderMatch[];
} => {
  const matches: DiscoveredProviderMatch[] = [];
  const invalidProviderMatches: MatchesInvalidProviderMatch[] = [];

  for (const rawEvent of input.payload.events) {
    const mappedEvent = mapProviderMatchEvent({
      tournamentId: input.tournamentId,
      round: input.round,
      rawEvent,
    });

    if ('errorMessage' in mappedEvent) {
      invalidProviderMatches.push(mappedEvent);
      continue;
    }

    matches.push(mappedEvent);
  }

  return {
    matches,
    invalidProviderMatches,
  };
};

export const collectDiscoveredMatchExternalIds = (matches: DiscoveredProviderMatch[]): string[] => {
  return [...new Set(matches.map(match => match.externalId))];
};

export const collectDiscoveredMatchTeamExternalIds = (matches: DiscoveredProviderMatch[]): string[] => {
  return [
    ...new Set(
      matches
        .flatMap(match => [match.externalHomeTeamId, match.externalAwayTeamId])
        .filter(externalId => externalId.trim())
    ),
  ];
};

const mapProviderMatchEvent = (input: {
  tournamentId: string;
  round: MatchesRoundContext;
  rawEvent: SofaScoreRoundMatchEvent;
}): DiscoveredProviderMatch | MatchesInvalidProviderMatch => {
  const matchExternalId = normalizeExternalId(input.rawEvent.id);
  const homeTeamExternalId = normalizeExternalId(input.rawEvent.homeTeam?.id);
  const awayTeamExternalId = normalizeExternalId(input.rawEvent.awayTeam?.id);

  if (!matchExternalId) {
    return buildInvalidProviderMatch({
      round: input.round,
      requestUrl: input.round.providerUrl,
      errorMessage: 'Provider match event is missing a valid event id',
    });
  }

  if (!homeTeamExternalId || !awayTeamExternalId) {
    return buildInvalidProviderMatch({
      round: input.round,
      requestUrl: input.round.providerUrl,
      matchExternalId,
      homeTeamExternalId: homeTeamExternalId ?? undefined,
      awayTeamExternalId: awayTeamExternalId ?? undefined,
      errorMessage: 'Provider match event is missing one or both team ids',
    });
  }

  return {
    roundId: input.round.id,
    roundLabel: input.round.label,
    roundSlug: input.round.slug,
    requestUrl: input.round.providerUrl,
    externalId: matchExternalId,
    provider: 'sofascore',
    tournamentId: input.tournamentId,
    externalHomeTeamId: homeTeamExternalId,
    externalAwayTeamId: awayTeamExternalId,
    homeScore: extractSofaScoreMainScore(input.rawEvent.homeScore),
    homePenaltiesScore: extractSofaScorePenaltiesScore(input.rawEvent.homeScore),
    awayScore: extractSofaScoreMainScore(input.rawEvent.awayScore),
    awayPenaltiesScore: extractSofaScorePenaltiesScore(input.rawEvent.awayScore),
    date: normalizeSofaScoreDate(input.rawEvent.startTimestamp),
    status: mapSofaScoreStatusTypeToMatchStatus(input.rawEvent.status?.type),
  };
};

const buildInvalidProviderMatch = (input: {
  round: MatchesRoundContext;
  requestUrl: string;
  errorMessage: string;
  matchExternalId?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
}): MatchesInvalidProviderMatch => {
  return {
    roundId: input.round.id,
    roundLabel: input.round.label,
    roundSlug: input.round.slug,
    requestUrl: input.requestUrl,
    matchExternalId: input.matchExternalId,
    homeTeamExternalId: input.homeTeamExternalId,
    awayTeamExternalId: input.awayTeamExternalId,
    errorMessage: input.errorMessage,
  };
};

const normalizeExternalId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
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

const extractSofaScoreMainScore = (scoreNode: SofaScoreMatchScoreNode | null | undefined): number | null => {
  const displayScore = parseNullableNumber(scoreNode?.display);
  if (displayScore !== null) {
    return displayScore;
  }

  return parseNullableNumber(scoreNode?.current);
};

const extractSofaScorePenaltiesScore = (scoreNode: SofaScoreMatchScoreNode | null | undefined): number | null => {
  return parseNullableNumber(scoreNode?.penalties);
};

const normalizeSofaScoreDate = (startTimestamp: number | null | undefined): Date | null => {
  if (typeof startTimestamp !== 'number' || !Number.isFinite(startTimestamp)) {
    return null;
  }

  return new Date(startTimestamp * 1000);
};

const mapSofaScoreStatusTypeToMatchStatus = (statusType: string | null | undefined): DB_SelectMatch['status'] => {
  if (statusType === 'finished') {
    return 'ended';
  }

  if (statusType === 'postponed') {
    return 'not-defined';
  }

  return 'open';
};
