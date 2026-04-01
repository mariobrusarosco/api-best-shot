import type {
  CurrentRoundSyncFailure,
  CurrentRoundSyncInvalidInput,
  CurrentRoundSyncTournamentContext,
  TournamentCurrentRoundSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import { updateTournamentCurrentRound } from '@/domains/data-provider-v2/persistence/tournament/update-tournament-current-round';
import { buildSofaScoreTournamentRoundsUrl } from '@/domains/data-provider-v2/providers/sofascore/endpoints';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';

export const runTournamentCurrentRoundSync = async (input: {
  tournament: CurrentRoundSyncTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentCurrentRoundSyncWorkflowResult> => {
  const tournament = normalizeTournamentCurrentRoundContext(input.tournament);
  const invalidInput = validateTournamentCurrentRoundContext(tournament);

  if (invalidInput.length > 0) {
    return {
      outcome: 'invalid_input',
      tournament,
      requestUrl: undefined,
      fetchedRounds: 0,
      providerIssues: [],
      invalidInput,
    };
  }

  const requestUrl = buildSofaScoreTournamentRoundsUrl(tournament.baseUrl);

  try {
    const payload = await input.roundProvider.fetchTournamentRounds({
      baseUrl: tournament.baseUrl,
    });

    const fetchedRounds = Array.isArray(payload.rounds) ? payload.rounds.length : 0;
    const currentRoundSlug = extractCurrentRoundSlug(payload.currentRound);

    if (!currentRoundSlug) {
      return {
        outcome: 'provider_response_missing_current_round',
        tournament,
        requestUrl,
        fetchedRounds,
        providerIssues: [
          {
            requestUrl,
            kind: 'missing_current_round',
            errorMessage: 'SofaScore tournament rounds payload did not contain a usable current round',
          },
        ],
      };
    }

    try {
      const updatedTournament = await updateTournamentCurrentRound({
        tournamentId: tournament.tournamentId,
        currentRound: currentRoundSlug,
      });

      if (!updatedTournament) {
        return {
          outcome: 'database_update_failed',
          tournament,
          requestUrl,
          fetchedRounds,
          providerIssues: [],
          currentRoundSlug,
          databaseUpdateFailure: {
            requestUrl,
            currentRoundSlug,
            errorMessage: `Tournament "${tournament.tournamentId}" not found while updating current round`,
          },
        };
      }

      return {
        outcome: 'updated',
        tournament,
        requestUrl,
        fetchedRounds,
        providerIssues: [],
        currentRoundSlug,
        updatedTournament,
      };
    } catch (error) {
      return {
        outcome: 'database_update_failed',
        tournament,
        requestUrl,
        fetchedRounds,
        providerIssues: [],
        currentRoundSlug,
        databaseUpdateFailure: normalizeFailure({
          requestUrl,
          currentRoundSlug,
          error,
          fallbackMessage: 'Failed to persist tournament current round',
        }),
      };
    }
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return {
        outcome: 'provider_response_missing_current_round',
        tournament,
        requestUrl,
        fetchedRounds: 0,
        providerIssues: [
          {
            requestUrl,
            kind: error.status === 404 ? 'provider_404' : 'request_failed',
            errorMessage: error.message,
            causeMessage: error.causeMessage,
            responseBodySnippet: error.responseBodySnippet,
          },
        ],
      };
    }

    return {
      outcome: 'unexpected_failure',
      tournament,
      requestUrl,
      fetchedRounds: 0,
      providerIssues: [],
      unexpectedFailure: normalizeFailure({
        requestUrl,
        error,
        fallbackMessage: 'Unexpected tournament current round sync failure',
      }),
    };
  }
};

export const normalizeTournamentCurrentRoundContext = (
  tournament: CurrentRoundSyncTournamentContext
): CurrentRoundSyncTournamentContext => {
  return {
    tournamentId: tournament.tournamentId.trim(),
    tournamentLabel: tournament.tournamentLabel.trim(),
    tournamentSlug: tournament.tournamentSlug.trim(),
    baseUrl: tournament.baseUrl.trim(),
    provider: tournament.provider,
    previousCurrentRound: tournament.previousCurrentRound?.trim() || null,
  };
};

const validateTournamentCurrentRoundContext = (
  tournament: CurrentRoundSyncTournamentContext
): CurrentRoundSyncInvalidInput[] => {
  const errors: CurrentRoundSyncInvalidInput[] = [];

  if (!tournament.tournamentId) {
    errors.push({
      field: 'tournamentId',
      errorMessage: 'Tournament ID is required',
    });
  }

  if (!tournament.baseUrl) {
    errors.push({
      field: 'baseUrl',
      errorMessage: 'Tournament baseUrl is required',
    });
  }

  return errors;
};

const extractCurrentRoundSlug = (currentRound?: { slug?: string; round?: number } | null): string | null => {
  const roundValue = typeof currentRound?.round === 'number' ? String(currentRound.round) : '';
  const rawValue = currentRound?.slug?.trim() || roundValue;

  if (!rawValue) {
    return null;
  }

  return rawValue.toLowerCase();
};

const normalizeFailure = (input: {
  requestUrl?: string;
  currentRoundSlug?: string;
  error: unknown;
  fallbackMessage: string;
}): CurrentRoundSyncFailure => {
  const causeMessage = input.error instanceof Error ? input.error.message : String(input.error);

  return {
    requestUrl: input.requestUrl,
    currentRoundSlug: input.currentRoundSlug,
    errorMessage: input.fallbackMessage,
    causeMessage,
  };
};
