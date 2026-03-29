import type {
  DiscoveredProviderRound,
  RoundsInvalidProviderRound,
  RoundsProviderIssue,
  RoundsTournamentContext,
} from '@/domains/data-provider-v2/contracts/rounds';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { buildSofaScoreTournamentRoundsUrl } from '@/domains/data-provider-v2/providers/sofascore/endpoints';
import { mapProviderRounds } from './map-provider-rounds';

export const prepareTournamentRounds = async (input: {
  tournament: RoundsTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<{
  requestUrl: string;
  fetchedRounds: number;
  discoveredRounds: DiscoveredProviderRound[];
  providerIssues: RoundsProviderIssue[];
  invalidProviderRounds: RoundsInvalidProviderRound[];
}> => {
  const requestUrl = buildSofaScoreTournamentRoundsUrl(input.tournament.baseUrl);

  try {
    const payload = await input.roundProvider.fetchTournamentRounds({
      baseUrl: input.tournament.baseUrl,
    });

    if (!Array.isArray(payload.rounds) || payload.rounds.length === 0) {
      return {
        requestUrl,
        fetchedRounds: 0,
        discoveredRounds: [],
        providerIssues: [
          {
            requestUrl,
            kind: 'empty_payload',
            errorMessage: 'SofaScore tournament rounds payload did not contain any rounds',
          },
        ],
        invalidProviderRounds: [],
      };
    }

    const { discoveredRounds, invalidProviderRounds } = mapProviderRounds({
      tournamentId: input.tournament.tournamentId,
      baseUrl: input.tournament.baseUrl,
      rounds: payload.rounds,
      requestUrl,
    });

    if (discoveredRounds.length === 0) {
      return {
        requestUrl,
        fetchedRounds: payload.rounds.length,
        discoveredRounds: [],
        providerIssues: [
          {
            requestUrl,
            kind: 'empty_payload',
            errorMessage: 'SofaScore tournament rounds payload did not contain any usable rounds',
          },
        ],
        invalidProviderRounds,
      };
    }

    return {
      requestUrl,
      fetchedRounds: payload.rounds.length,
      discoveredRounds,
      providerIssues: [],
      invalidProviderRounds,
    };
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return {
        requestUrl,
        fetchedRounds: 0,
        discoveredRounds: [],
        providerIssues: [
          {
            requestUrl,
            kind: error.status === 404 ? 'provider_404' : 'empty_payload',
            errorMessage: error.message,
            causeMessage: error.causeMessage,
            responseBodySnippet: error.responseBodySnippet,
          },
        ],
        invalidProviderRounds: [],
      };
    }

    throw error;
  }
};
