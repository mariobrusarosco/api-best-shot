import type {
  RoundsTournamentContext,
  TournamentRoundsCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/rounds';
import { listTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds';
import { upsertTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/upsert-tournament-rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { prepareTournamentRounds } from './prepare-tournament-rounds';

export const runTournamentRoundsCreate = async (input: {
  tournament: RoundsTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentRoundsCreateWorkflowResult> => {
  const prepared = await prepareTournamentRounds({
    tournament: input.tournament,
    roundProvider: input.roundProvider,
  });

  const existingRounds = await listTournamentRounds({
    tournamentId: input.tournament.tournamentId,
  });

  if (prepared.discoveredRounds.length === 0) {
    return {
      outcome: 'provider_response_missing_rounds',
      tournament: input.tournament,
      requestUrl: prepared.requestUrl,
      fetchedRounds: prepared.fetchedRounds,
      discoveredRounds: [],
      providerIssues: prepared.providerIssues,
      invalidProviderRounds: prepared.invalidProviderRounds,
      existingRounds: [],
      upsertableRounds: [],
      upsertedRounds: [],
      createdRounds: [],
      skippedExistingRounds: [],
    };
  }

  const upsertableRounds = prepared.discoveredRounds;
  const discoveredRoundSlugs = new Set(prepared.discoveredRounds.map(round => round.slug));
  const existingRoundSlugs = new Set(existingRounds.map(round => round.slug));
  const skippedExistingRounds = existingRounds.filter(round => discoveredRoundSlugs.has(round.slug));

  try {
    const upsertedRounds = await upsertTournamentRounds({
      rounds: upsertableRounds,
    });
    const createdRounds = upsertedRounds.filter(round => !existingRoundSlugs.has(round.slug));

    return {
      outcome: 'processed',
      tournament: input.tournament,
      requestUrl: prepared.requestUrl,
      fetchedRounds: prepared.fetchedRounds,
      discoveredRounds: prepared.discoveredRounds,
      providerIssues: prepared.providerIssues,
      invalidProviderRounds: prepared.invalidProviderRounds,
      existingRounds,
      upsertableRounds,
      upsertedRounds,
      createdRounds,
      skippedExistingRounds,
    };
  } catch (error) {
    return {
      outcome: 'database_upsert_failed',
      tournament: input.tournament,
      requestUrl: prepared.requestUrl,
      fetchedRounds: prepared.fetchedRounds,
      discoveredRounds: prepared.discoveredRounds,
      providerIssues: prepared.providerIssues,
      invalidProviderRounds: prepared.invalidProviderRounds,
      existingRounds,
      upsertableRounds,
      upsertedRounds: [],
      createdRounds: [],
      skippedExistingRounds,
      databaseUpsertFailure: buildRoundsFailure(error),
    };
  }
};

const buildRoundsFailure = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: String(error),
  };
};
