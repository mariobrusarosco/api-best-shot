import { setTimeout as sleep } from 'timers/promises';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  DiscoveredProviderMatch,
  MatchesInvalidProviderMatch,
  MatchesProviderIssue,
  MatchesRoundContext,
  MatchesTournamentContext,
  SofaScoreRoundMatchesPayload,
} from '@/domains/data-provider-v2/contracts/matches';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { collectDiscoveredMatchExternalIds, mapRoundProviderMatches } from './map-provider-matches';

export type PreparedTournamentMatchesResult = {
  fetchedRounds: number;
  discoveredMatches: DiscoveredProviderMatch[];
  providerIssues: MatchesProviderIssue[];
  invalidProviderMatches: MatchesInvalidProviderMatch[];
};

const MATCH_ROUND_FETCH_DELAY_MS = 2500;

export const prepareTournamentMatches = async (input: {
  tournament: MatchesTournamentContext;
  rounds: MatchesRoundContext[];
  roundProvider: SofaScoreRoundProvider;
}): Promise<PreparedTournamentMatchesResult> => {
  const discoveredMatches: DiscoveredProviderMatch[] = [];
  const providerIssues: MatchesProviderIssue[] = [];
  const invalidProviderMatches: MatchesInvalidProviderMatch[] = [];
  let fetchedRounds = 0;

  for (const [index, round] of input.rounds.entries()) {
    fetchedRounds++;

    try {
      const payload = await input.roundProvider.fetchTournamentRound<SofaScoreRoundMatchesPayload>({
        providerUrl: round.providerUrl,
      });

      if (!Array.isArray(payload.events) || payload.events.length === 0) {
        providerIssues.push({
          roundId: round.id,
          roundLabel: round.label,
          roundSlug: round.slug,
          requestUrl: round.providerUrl,
          kind: 'empty_payload',
          errorMessage: `Round "${round.slug}" did not contain any provider match events`,
        });
        continue;
      }

      const mapped = mapRoundProviderMatches({
        tournamentId: input.tournament.tournamentId,
        round,
        payload,
      });

      discoveredMatches.push(...mapped.matches);
      invalidProviderMatches.push(...mapped.invalidProviderMatches);
    } catch (error) {
      providerIssues.push(
        buildProviderIssue({
          round,
          error,
        })
      );
    } finally {
      if (index < input.rounds.length - 1) {
        await sleep(MATCH_ROUND_FETCH_DELAY_MS);
      }
    }
  }

  return {
    fetchedRounds,
    discoveredMatches: dedupeDiscoveredMatches(discoveredMatches),
    providerIssues,
    invalidProviderMatches,
  };
};

const buildProviderIssue = (input: { round: MatchesRoundContext; error: unknown }): MatchesProviderIssue => {
  if (input.error instanceof ProviderRequestError && input.error.status === 404) {
    return {
      roundId: input.round.id,
      roundLabel: input.round.label,
      roundSlug: input.round.slug,
      requestUrl: input.error.requestUrl,
      kind: 'provider_404',
      errorMessage: input.error.message,
      causeMessage: input.error.causeMessage,
      responseBodySnippet: input.error.responseBodySnippet,
    };
  }

  return {
    roundId: input.round.id,
    roundLabel: input.round.label,
    roundSlug: input.round.slug,
    requestUrl: input.error instanceof ProviderRequestError ? input.error.requestUrl : input.round.providerUrl,
    kind: 'empty_payload',
    errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
    causeMessage: input.error instanceof ProviderRequestError ? input.error.causeMessage : undefined,
    responseBodySnippet: input.error instanceof ProviderRequestError ? input.error.responseBodySnippet : undefined,
  };
};

const dedupeDiscoveredMatches = (matches: DiscoveredProviderMatch[]): DiscoveredProviderMatch[] => {
  const matchByExternalId = new Map(matches.map(match => [match.externalId, match]));
  const orderedExternalIds = collectDiscoveredMatchExternalIds(matches);

  return orderedExternalIds.map(externalId => matchByExternalId.get(externalId)!);
};
