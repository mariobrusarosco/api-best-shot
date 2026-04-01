import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  CurrentRoundSyncBatchSummary,
  CurrentRoundSyncTournamentContext,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import {
  runTournamentCurrentRoundSyncOperation,
  type TournamentCurrentRoundSyncOperationResult,
} from '@/domains/data-provider-v2/operations/current-round-sync/tournament-operation-runner';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import {
  PlaywrightRuntime,
  type PlaywrightRuntimeOptions,
} from '@/domains/data-provider-v2/transport/playwright/runtime';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export type CurrentRoundSyncBatchResult = {
  summary: CurrentRoundSyncBatchSummary;
  results: TournamentCurrentRoundSyncOperationResult[];
  skippedTournamentIds: string[];
};

export const runCurrentRoundSyncBatch = async (input: {
  tournamentIds: string[];
  runtimeOptions?: PlaywrightRuntimeOptions;
}): Promise<CurrentRoundSyncBatchResult> => {
  const normalizedTournamentIds = normalizeTournamentIds(input.tournamentIds);
  const resolution = await resolveEligibleTournaments(normalizedTournamentIds);

  const summary: CurrentRoundSyncBatchSummary = {
    schedulerTarget: 'tournaments.current_round_sync',
    totalRequestedTournaments: normalizedTournamentIds.length,
    queuedTournaments: resolution.tournaments.length,
    completedTournaments: 0,
    failedTournaments: 0,
    skippedInvalidTournaments: resolution.skippedTournamentIds.length,
    skippedTournamentIdsPreview: resolution.skippedTournamentIds.slice(0, 10),
  };
  const results: TournamentCurrentRoundSyncOperationResult[] = [];

  if (resolution.tournaments.length === 0) {
    return {
      summary,
      results,
      skippedTournamentIds: resolution.skippedTournamentIds,
    };
  }

  let runtime: PlaywrightRuntime | null = null;
  let session: BrowserSession | null = null;

  try {
    runtime = await PlaywrightRuntime.create(input.runtimeOptions);
    session = await runtime.createSession();

    for (const tournament of resolution.tournaments) {
      try {
        const result = await runTournamentCurrentRoundSyncOperation({
          session,
          tournament,
        });
        results.push(result);

        if (result.status === 'completed') {
          summary.completedTournaments++;
        } else {
          summary.failedTournaments++;
        }
      } catch (error) {
        summary.failedTournaments++;

        Logger.error(error as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'use-case',
          operation: 'runCurrentRoundSyncBatch',
          tournamentId: tournament.tournamentId,
          tournamentLabel: tournament.tournamentLabel,
        });
      }
    }
  } finally {
    await session?.close();
    await runtime?.close();
  }

  return {
    summary,
    results,
    skippedTournamentIds: resolution.skippedTournamentIds,
  };
};

const normalizeTournamentIds = (tournamentIds: string[]): string[] => {
  return Array.from(
    new Set(
      tournamentIds
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(value => value !== '')
    )
  );
};

const resolveEligibleTournaments = async (
  tournamentIds: string[]
): Promise<{
  tournaments: CurrentRoundSyncTournamentContext[];
  skippedTournamentIds: string[];
}> => {
  const tournaments: CurrentRoundSyncTournamentContext[] = [];
  const skippedTournamentIds: string[] = [];

  for (const tournamentId of tournamentIds) {
    const tournament = await SERVICES_TOURNAMENT.getTournamentRecord(tournamentId);

    if (!tournament || tournament.provider !== 'sofascore' || !tournament.baseUrl?.trim()) {
      skippedTournamentIds.push(tournamentId);
      continue;
    }

    tournaments.push({
      tournamentId: tournament.id,
      tournamentLabel: tournament.label,
      tournamentSlug: tournament.slug,
      baseUrl: tournament.baseUrl,
      provider: 'sofascore',
      previousCurrentRound: tournament.currentRound,
    });
  }

  return {
    tournaments,
    skippedTournamentIds,
  };
};
