import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { runOpenMatchSyncBatch } from '@/domains/data-provider-v2/use-cases/open-match-sync/run-open-match-sync-batch';
import { runStandingsUpdateBatch } from '@/domains/data-provider-v2/use-cases/standings/run-standings-update-batch';
import { scoreboardApplyPendingTournamentsHandler } from './scoreboard-apply-pending-tournaments';

export const matchesSyncEndedHandler = async (): Promise<void> => {
  const batchSummary = await runOpenMatchSyncBatch();
  const affectedTournamentIds = batchSummary.tournamentIdsWithEndedMatches;
  let scoreboardError: Error | null = null;
  let standingsError: Error | null = null;
  let standingsBatchSummary: Awaited<ReturnType<typeof runStandingsUpdateBatch>>['summary'] | undefined;

  if (affectedTournamentIds.length > 0) {
    try {
      await scoreboardApplyPendingTournamentsHandler();
    } catch (error) {
      scoreboardError = error instanceof Error ? error : new Error(String(error));

      Logger.error(scoreboardError, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'cron',
        operation: 'matchesSyncEndedHandler.scoreboardFollowUp',
        affectedTournamentIds: JSON.stringify(affectedTournamentIds),
      });
    }

    try {
      const standingsBatch = await runStandingsUpdateBatch({
        tournamentIds: affectedTournamentIds,
      });

      standingsBatchSummary = standingsBatch.summary;

      if (standingsBatch.summary.failedTournaments > 0) {
        standingsError = new Error(
          `Standings update failed for ${standingsBatch.summary.failedTournaments}/${standingsBatch.summary.queuedTournaments} tournaments`
        );
      }
    } catch (error) {
      standingsError = error instanceof Error ? error : new Error(String(error));
    }

    if (standingsError) {
      Logger.error(standingsError, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'cron',
        operation: 'matchesSyncEndedHandler.standingsFollowUp',
        affectedTournamentIds: JSON.stringify(affectedTournamentIds),
        standingsBatchSummary: standingsBatchSummary ? JSON.stringify(standingsBatchSummary) : undefined,
      });
    }
  }

  Logger.audit(
    `[CRON_TARGET:matches.sync_ended] scanned=${batchSummary.scannedMatches} skippedInvalid=${batchSummary.skippedInvalidMatches} queued=${batchSummary.tournamentsQueued} completed=${batchSummary.tournamentsCompleted} failed=${batchSummary.tournamentsFailed} endedTournaments=${affectedTournamentIds.length}`,
    {
      schedulerTarget: batchSummary.schedulerTarget,
      scannedMatches: batchSummary.scannedMatches,
      skippedInvalidMatches: batchSummary.skippedInvalidMatches,
      tournamentsQueued: batchSummary.tournamentsQueued,
      tournamentsCompleted: batchSummary.tournamentsCompleted,
      tournamentsFailed: batchSummary.tournamentsFailed,
      tournamentIdsWithEndedMatches: affectedTournamentIds,
      scoreboardFollowUpStatus: scoreboardError ? 'failed' : affectedTournamentIds.length > 0 ? 'completed' : 'skipped',
      standingsFollowUpStatus: standingsError ? 'failed' : affectedTournamentIds.length > 0 ? 'completed' : 'skipped',
      standingsBatchSummary,
    }
  );

  if (scoreboardError && standingsError) {
    throw new Error(
      `matches.sync_ended follow-up failures: scoreboard="${scoreboardError.message}" standings="${standingsError.message}"`
    );
  }

  if (scoreboardError) {
    throw scoreboardError;
  }

  if (standingsError) {
    throw standingsError;
  }
};
