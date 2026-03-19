import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  OpenMatchSyncBatchSummary,
  OpenMatchSyncDueMatch,
} from '@/domains/data-provider-v2/contracts/open-match-sync';
import { listDueOpenMatches } from '@/domains/data-provider-v2/persistence/open-match-sync/list-due-open-matches';
import { SofaScoreMatchProvider } from '@/domains/data-provider-v2/providers/sofascore/match-provider';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import {
  PlaywrightRuntime,
  type PlaywrightRuntimeOptions,
} from '@/domains/data-provider-v2/transport/playwright/runtime';
import { runTournamentOpenMatchSync } from './run-tournament-open-match-sync';

const DEFAULT_OPEN_MATCH_SYNC_BATCH_LIMIT = 30;

export const runOpenMatchSyncBatch = async (
  input: {
    now?: Date;
    limit?: number;
    runtimeOptions?: PlaywrightRuntimeOptions;
  } = {}
): Promise<OpenMatchSyncBatchSummary> => {
  const now = input.now ?? new Date();
  const dueMatches = await listDueOpenMatches({
    now,
    limit: input.limit ?? DEFAULT_OPEN_MATCH_SYNC_BATCH_LIMIT,
  });

  const groupedMatches = groupDueMatchesByTournamentId(dueMatches);
  const summary: OpenMatchSyncBatchSummary = {
    schedulerTarget: 'matches.sync_ended',
    scannedMatches: dueMatches.length,
    skippedInvalidMatches: dueMatches.length - groupedMatches.validMatchCount,
    tournamentsQueued: groupedMatches.groups.size,
    tournamentsCompleted: 0,
    tournamentsFailed: 0,
  };

  if (groupedMatches.groups.size === 0) return summary;

  let runtime: PlaywrightRuntime | null = null;

  try {
    runtime = await PlaywrightRuntime.create(input.runtimeOptions);

    for (const [tournamentId, tournamentMatches] of groupedMatches.groups.entries()) {
      let session: BrowserSession | null = null;

      try {
        session = await runtime.createSession();
        const provider = SofaScoreMatchProvider.fromSession(session);
        const result = await runTournamentOpenMatchSync({
          tournamentId,
          dueMatches: tournamentMatches,
          provider,
        });

        if (result.summary.failedOperations > 0) summary.tournamentsFailed++;
        else summary.tournamentsCompleted++;
      } catch (error) {
        summary.tournamentsFailed++;

        Logger.error(error as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'use-case',
          operation: 'runOpenMatchSyncBatch',
          tournamentId,
        });
      } finally {
        await session?.close();
      }
    }
  } finally {
    await runtime?.close();
  }

  return summary;
};

const groupDueMatchesByTournamentId = (
  dueMatches: OpenMatchSyncDueMatch[]
): {
  groups: Map<string, OpenMatchSyncDueMatch[]>;
  validMatchCount: number;
} => {
  const groups = new Map<string, OpenMatchSyncDueMatch[]>();
  let validMatchCount = 0;

  for (const match of dueMatches) {
    const tournamentId = match.tournamentId?.trim();

    if (!tournamentId) {
      continue;
    }

    const tournamentMatches = groups.get(tournamentId) ?? [];
    tournamentMatches.push(match);
    groups.set(tournamentId, tournamentMatches);
    validMatchCount++;
  }

  return {
    groups,
    validMatchCount,
  };
};
