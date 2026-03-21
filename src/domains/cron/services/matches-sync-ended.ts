import Logger from '@/core/logger';
import { runOpenMatchSyncBatch } from '@/domains/data-provider-v2/use-cases/open-match-sync/run-open-match-sync-batch';

export const matchesSyncEndedHandler = async (): Promise<void> => {
  const batchSummary = await runOpenMatchSyncBatch();

  Logger.audit(
    `[CRON_TARGET:matches.sync_ended] scanned=${batchSummary.scannedMatches} skippedInvalid=${batchSummary.skippedInvalidMatches} queued=${batchSummary.tournamentsQueued} completed=${batchSummary.tournamentsCompleted} failed=${batchSummary.tournamentsFailed}`,
    {
      schedulerTarget: batchSummary.schedulerTarget,
      scannedMatches: batchSummary.scannedMatches,
      skippedInvalidMatches: batchSummary.skippedInvalidMatches,
      tournamentsQueued: batchSummary.tournamentsQueued,
      tournamentsCompleted: batchSummary.tournamentsCompleted,
      tournamentsFailed: batchSummary.tournamentsFailed,
    }
  );
};
