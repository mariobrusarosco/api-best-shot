import type {
  KnockoutRoundAvailabilityIssue,
  KnockoutRoundsSyncTournamentContext,
  TournamentKnockoutRoundsSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import type {
  MatchesRoundContext,
  MatchesTournamentContext,
  SofaScoreRoundMatchesPayload,
} from '@/domains/data-provider-v2/contracts/matches';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import { listTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds';
import { upsertTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/upsert-tournament-rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { runTournamentMatchesCreateForRounds } from '@/domains/data-provider-v2/use-cases/matches/run-tournament-matches-create-for-rounds';
import { prepareTournamentRounds } from '@/domains/data-provider-v2/use-cases/rounds/prepare-tournament-rounds';

export const runTournamentKnockoutRoundsSync = async (input: {
  tournament: KnockoutRoundsSyncTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentKnockoutRoundsSyncWorkflowResult> => {
  let requestUrl = '';

  try {
    const prepared = await prepareTournamentRounds({
      tournament: {
        tournamentId: input.tournament.tournamentId,
        tournamentLabel: input.tournament.tournamentLabel,
        baseUrl: input.tournament.baseUrl,
        provider: input.tournament.provider,
      },
      roundProvider: input.roundProvider,
    });
    requestUrl = prepared.requestUrl;

    const existingRounds = await listTournamentRounds({
      tournamentId: input.tournament.tournamentId,
    });

    if (prepared.discoveredRounds.length === 0) {
      return {
        outcome: 'provider_response_missing_rounds',
        tournament: input.tournament,
        requestUrl,
        fetchedRounds: prepared.fetchedRounds,
        discoveredRounds: [],
        providerIssues: prepared.providerIssues,
        invalidProviderRounds: prepared.invalidProviderRounds,
        existingRounds,
        candidateKnockoutRounds: [],
        readyKnockoutRounds: [],
        notReadyKnockoutRounds: [],
        upsertableRounds: [],
        upsertedRounds: [],
        createdRounds: [],
        matchesResult: null,
      };
    }

    const existingRoundSlugs = new Set(existingRounds.map(round => round.slug));
    const candidateKnockoutRounds = prepared.discoveredRounds.filter(
      round => round.type === 'knockout' && !existingRoundSlugs.has(round.slug)
    );

    if (candidateKnockoutRounds.length === 0) {
      return {
        outcome: 'no_new_knockout_rounds',
        tournament: input.tournament,
        requestUrl,
        fetchedRounds: prepared.fetchedRounds,
        discoveredRounds: prepared.discoveredRounds,
        providerIssues: prepared.providerIssues,
        invalidProviderRounds: prepared.invalidProviderRounds,
        existingRounds,
        candidateKnockoutRounds: [],
        readyKnockoutRounds: [],
        notReadyKnockoutRounds: [],
        upsertableRounds: [],
        upsertedRounds: [],
        createdRounds: [],
        matchesResult: null,
      };
    }

    const readiness = await resolveKnockoutRoundAvailability({
      rounds: candidateKnockoutRounds,
      roundProvider: input.roundProvider,
    });
    const upsertableRounds = readiness.readyKnockoutRounds;

    if (upsertableRounds.length === 0) {
      return {
        outcome: 'processed',
        tournament: input.tournament,
        requestUrl,
        fetchedRounds: prepared.fetchedRounds,
        discoveredRounds: prepared.discoveredRounds,
        providerIssues: prepared.providerIssues,
        invalidProviderRounds: prepared.invalidProviderRounds,
        existingRounds,
        candidateKnockoutRounds,
        readyKnockoutRounds: [],
        notReadyKnockoutRounds: readiness.notReadyKnockoutRounds,
        upsertableRounds: [],
        upsertedRounds: [],
        createdRounds: [],
        matchesResult: null,
      };
    }

    let upsertedRounds: TournamentKnockoutRoundsSyncWorkflowResult['upsertedRounds'];

    try {
      upsertedRounds = await upsertTournamentRounds({
        rounds: upsertableRounds,
      });
    } catch (error) {
      return {
        outcome: 'database_upsert_failed',
        tournament: input.tournament,
        requestUrl,
        fetchedRounds: prepared.fetchedRounds,
        discoveredRounds: prepared.discoveredRounds,
        providerIssues: prepared.providerIssues,
        invalidProviderRounds: prepared.invalidProviderRounds,
        existingRounds,
        candidateKnockoutRounds,
        readyKnockoutRounds: upsertableRounds,
        notReadyKnockoutRounds: readiness.notReadyKnockoutRounds,
        upsertableRounds,
        upsertedRounds: [],
        createdRounds: [],
        matchesResult: null,
        databaseUpsertFailure: buildFailure(error),
      };
    }

    const persistedRounds = mapRoundsForMatches(upsertedRounds);
    const matchesResult = await runTournamentMatchesCreateForRounds({
      tournament: mapTournamentForMatches(input.tournament),
      rounds: persistedRounds,
      roundProvider: input.roundProvider,
    });

    return {
      outcome: 'processed',
      tournament: input.tournament,
      requestUrl,
      fetchedRounds: prepared.fetchedRounds,
      discoveredRounds: prepared.discoveredRounds,
      providerIssues: prepared.providerIssues,
      invalidProviderRounds: prepared.invalidProviderRounds,
      existingRounds,
      candidateKnockoutRounds,
      readyKnockoutRounds: upsertableRounds,
      notReadyKnockoutRounds: readiness.notReadyKnockoutRounds,
      upsertableRounds,
      upsertedRounds,
      createdRounds: upsertedRounds,
      matchesResult,
    };
  } catch (error) {
    return {
      outcome: 'unexpected_failure',
      tournament: input.tournament,
      requestUrl,
      fetchedRounds: 0,
      discoveredRounds: [],
      providerIssues: [],
      invalidProviderRounds: [],
      existingRounds: [],
      candidateKnockoutRounds: [],
      readyKnockoutRounds: [],
      notReadyKnockoutRounds: [],
      upsertableRounds: [],
      upsertedRounds: [],
      createdRounds: [],
      matchesResult: null,
      unexpectedFailure: {
        requestUrl: requestUrl || undefined,
        errorMessage: 'Unexpected knockout rounds sync failure',
        causeMessage: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const resolveKnockoutRoundAvailability = async (input: {
  rounds: TournamentKnockoutRoundsSyncWorkflowResult['candidateKnockoutRounds'];
  roundProvider: SofaScoreRoundProvider;
}): Promise<{
  readyKnockoutRounds: TournamentKnockoutRoundsSyncWorkflowResult['readyKnockoutRounds'];
  notReadyKnockoutRounds: KnockoutRoundAvailabilityIssue[];
}> => {
  const readyKnockoutRounds: TournamentKnockoutRoundsSyncWorkflowResult['readyKnockoutRounds'] = [];
  const notReadyKnockoutRounds: KnockoutRoundAvailabilityIssue[] = [];

  for (const round of input.rounds) {
    try {
      const payload = await input.roundProvider.fetchTournamentRound<SofaScoreRoundMatchesPayload>({
        providerUrl: round.providerUrl,
      });

      if (!Array.isArray(payload.events) || payload.events.length === 0) {
        notReadyKnockoutRounds.push({
          roundLabel: round.label,
          roundSlug: round.slug,
          requestUrl: round.providerUrl,
          kind: 'empty_payload',
          errorMessage: `Knockout round "${round.slug}" does not have provider events yet`,
        });
        continue;
      }

      readyKnockoutRounds.push(round);
    } catch (error) {
      notReadyKnockoutRounds.push(buildAvailabilityIssue({ round, error }));
    }
  }

  return {
    readyKnockoutRounds,
    notReadyKnockoutRounds,
  };
};

const buildAvailabilityIssue = (input: {
  round: TournamentKnockoutRoundsSyncWorkflowResult['candidateKnockoutRounds'][number];
  error: unknown;
}): KnockoutRoundAvailabilityIssue => {
  if (input.error instanceof ProviderRequestError && input.error.status === 404) {
    return {
      roundLabel: input.round.label,
      roundSlug: input.round.slug,
      requestUrl: input.error.requestUrl,
      kind: 'provider_404',
      errorMessage: input.error.message,
      causeMessage: input.error.causeMessage,
      responseBodySnippet: input.error.responseBodySnippet,
    };
  }

  if (input.error instanceof ProviderRequestError) {
    return {
      roundLabel: input.round.label,
      roundSlug: input.round.slug,
      requestUrl: input.error.requestUrl,
      kind: 'request_failed',
      errorMessage: input.error.message,
      causeMessage: input.error.causeMessage,
      responseBodySnippet: input.error.responseBodySnippet,
    };
  }

  return {
    roundLabel: input.round.label,
    roundSlug: input.round.slug,
    requestUrl: input.round.providerUrl,
    kind: 'request_failed',
    errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
  };
};

const mapRoundsForMatches = (
  rounds: TournamentKnockoutRoundsSyncWorkflowResult['createdRounds']
): MatchesRoundContext[] => {
  return rounds.map(round => ({
    id: round.id,
    label: round.label,
    slug: round.slug,
    providerUrl: round.providerUrl,
  }));
};

const mapTournamentForMatches = (tournament: KnockoutRoundsSyncTournamentContext): MatchesTournamentContext => {
  return {
    tournamentId: tournament.tournamentId,
    tournamentLabel: tournament.tournamentLabel,
    provider: tournament.provider,
  };
};

const buildFailure = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: String(error),
  };
};
