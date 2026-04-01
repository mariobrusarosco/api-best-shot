import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  KnockoutRoundsSyncBatchSummary,
  KnockoutRoundsSyncTournamentContext,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import {
  runTournamentKnockoutRoundsSyncOperation,
  type TournamentKnockoutRoundsSyncOperationResult,
} from '@/domains/data-provider-v2/operations/knockout-rounds-sync/tournament-operation-runner';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import {
  PlaywrightRuntime,
  type PlaywrightRuntimeOptions,
} from '@/domains/data-provider-v2/transport/playwright/runtime';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import type { TournamentMode } from '@/domains/tournament/typing';

const KNOCKOUT_DISCOVERY_ELIGIBLE_MODES: TournamentMode[] = ['regular-season-and-knockout', 'knockout-only'];

export type KnockoutRoundsSyncBatchResult = {
  summary: KnockoutRoundsSyncBatchSummary;
  results: TournamentKnockoutRoundsSyncOperationResult[];
  skippedTournamentIds: string[];
};

export const runKnockoutRoundsSyncBatch = async (
  input: {
    runtimeOptions?: PlaywrightRuntimeOptions;
  } = {}
): Promise<KnockoutRoundsSyncBatchResult> => {
  const activeTournaments = await SERVICES_TOURNAMENT.listActiveTournamentsByModes(KNOCKOUT_DISCOVERY_ELIGIBLE_MODES);
  const resolution = await resolveEligibleTournaments(activeTournaments.map(tournament => tournament.id));

  const summary: KnockoutRoundsSyncBatchSummary = {
    schedulerTarget: 'tournaments.knockout_rounds_sync',
    totalEligibleTournaments: activeTournaments.length,
    queuedTournaments: resolution.tournaments.length,
    completedTournaments: 0,
    failedTournaments: 0,
    skippedInvalidTournaments: resolution.skippedTournamentIds.length,
    skippedTournamentIdsPreview: resolution.skippedTournamentIds.slice(0, 10),
  };
  const results: TournamentKnockoutRoundsSyncOperationResult[] = [];

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
        const result = await runTournamentKnockoutRoundsSyncOperation({
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
          operation: 'runKnockoutRoundsSyncBatch',
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

const resolveEligibleTournaments = async (
  tournamentIds: string[]
): Promise<{
  tournaments: KnockoutRoundsSyncTournamentContext[];
  skippedTournamentIds: string[];
}> => {
  const tournaments: KnockoutRoundsSyncTournamentContext[] = [];
  const skippedTournamentIds: string[] = [];

  for (const tournamentId of tournamentIds) {
    try {
      const tournament = await SERVICES_TOURNAMENT.getTournamentRecord(tournamentId);

      if (
        tournament.provider !== 'sofascore' ||
        !tournament.baseUrl?.trim() ||
        !KNOCKOUT_DISCOVERY_ELIGIBLE_MODES.includes(tournament.mode as TournamentMode)
      ) {
        skippedTournamentIds.push(tournamentId);
        continue;
      }

      tournaments.push({
        tournamentId: tournament.id,
        tournamentLabel: tournament.label,
        tournamentSlug: tournament.slug,
        baseUrl: tournament.baseUrl,
        provider: 'sofascore',
        mode: tournament.mode as TournamentMode,
      });
    } catch {
      skippedTournamentIds.push(tournamentId);
    }
  }

  return {
    tournaments,
    skippedTournamentIds,
  };
};
