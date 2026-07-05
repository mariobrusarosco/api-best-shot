import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  StandingsUpdateBatchSummary,
  StandingsUpdateTournamentContext,
} from '@/domains/data-provider-v2/contracts/standings';
import {
  runTournamentStandingsUpdateOperation,
  type TournamentStandingsUpdateOperationResult,
} from '@/domains/data-provider-v2/operations/standings-update/tournament-operation-runner';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import {
  PlaywrightRuntime,
  type PlaywrightRuntimeOptions,
} from '@/domains/data-provider-v2/transport/playwright/runtime';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

const SUMMARY_PREVIEW_LIMIT = 10;

export type StandingsUpdateBatchResult = {
  summary: StandingsUpdateBatchSummary;
  results: TournamentStandingsUpdateOperationResult[];
  skippedTournamentIds: string[];
};

export const runStandingsUpdateBatch = async (input: {
  tournamentIds: string[];
  runtimeOptions?: PlaywrightRuntimeOptions;
}): Promise<StandingsUpdateBatchResult> => {
  const normalizedTournamentIds = normalizeTournamentIds(input.tournamentIds);
  const resolution = await resolveEligibleTournaments(normalizedTournamentIds);

  const summary: StandingsUpdateBatchSummary = {
    totalRequestedTournaments: normalizedTournamentIds.length,
    queuedTournaments: resolution.tournaments.length,
    completedTournaments: 0,
    failedTournaments: 0,
    skippedInvalidTournaments: resolution.skippedTournamentIds.length,
    skippedTournamentIdsPreview: resolution.skippedTournamentIds.slice(0, SUMMARY_PREVIEW_LIMIT),
  };
  const results: TournamentStandingsUpdateOperationResult[] = [];

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
        const result = await runTournamentStandingsUpdateOperation({
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
          operation: 'runStandingsUpdateBatch',
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
  tournaments: StandingsUpdateTournamentContext[];
  skippedTournamentIds: string[];
}> => {
  const tournaments: StandingsUpdateTournamentContext[] = [];
  const skippedTournamentIds: string[] = [];

  for (const tournamentId of tournamentIds) {
    const tournament = await SERVICES_TOURNAMENT.getTournamentDetails(tournamentId);

    if (!tournament || tournament.provider !== 'sofascore') {
      skippedTournamentIds.push(tournamentId);
      continue;
    }

    tournaments.push({
      tournamentId,
      tournamentLabel: tournament.label,
      baseUrl: tournament.baseUrl,
      provider: 'sofascore',
      mode: tournament.mode,
      standingsMode: tournament.standingsMode,
    });
  }

  return {
    tournaments,
    skippedTournamentIds,
  };
};
