import Logger from '@/core/logger';
import { CRON_TARGET_IDS } from '@/domains/cron/constants';
import type { DB_SelectCronJobRun } from '@/domains/cron/schema';
import type { ICronRunTriggerType } from '@/domains/cron/typing';
import { runCurrentRoundSyncBatch } from '@/domains/data-provider-v2/use-cases/current-round-sync/run-current-round-sync-batch';
import { runKnockoutRoundsSyncBatch } from '@/domains/data-provider-v2/use-cases/knockout-rounds-sync/run-knockout-rounds-sync-batch';
import { SERVICES_DATA_PROVIDER_MATCH_SYNC } from '@/domains/data-provider/services/matches-sync';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { MatchQueries } from '@/domains/match/queries';
import { matchesSyncEndedHandler } from './matches-sync-ended';
import { scoreboardApplyPendingTournamentsHandler } from './scoreboard-apply-pending-tournaments';

export type CronTargetPayload = Record<string, unknown> | null | undefined;

type CronTargetContext = {
  runId: string;
  jobDefinitionId: string;
  jobKey: string;
  jobVersion: number;
  target: string;
  triggerType: ICronRunTriggerType;
  scheduledAt: Date;
  payload: CronTargetPayload;
};

type CronTargetHandler = (context: CronTargetContext) => Promise<void>;

const matchesSyncOpenHandler: CronTargetHandler = async () => {
  const matchSyncSummary = await SERVICES_DATA_PROVIDER_MATCH_SYNC.syncOpenMatchesFromProvider();
  const standingsSyncSummary = await StandingsDataProviderService.updateForTournamentIds(
    matchSyncSummary.tournamentsToRefresh
  );
  // TODO(realtime): Emit a WebSocket event here so clients can refresh match/tournament views without polling.

  Logger.audit('[CRON_TARGET:matches.sync_open', { standingsSyncSummary, matchSyncSummary });
};

const tournamentsCurrentRoundSyncHandler: CronTargetHandler = async () => {
  const todayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  const uniqueTournamentIds = new Set(todayMatches.map(match => match.tournamentId).filter(Boolean));
  const batchResult = await runCurrentRoundSyncBatch({
    tournamentIds: [...uniqueTournamentIds],
  });

  const tournaments = batchResult.results.map(result => ({
    tournamentId: result.tournamentId,
    tournamentLabel: result.tournamentLabel,
    currentRoundSlug: result.result.data.currentRoundSlug,
    status: result.status,
  }));

  Logger.audit(`[CRON_TARGET:tournaments.current_round_sync]`, {
    todayMatches,
    summary: batchResult.summary,
    tournaments,
  });

  if (batchResult.summary.failedTournaments > 0) {
    throw new Error(
      `Current round sync failed for ${batchResult.summary.failedTournaments}/${batchResult.summary.queuedTournaments} tournaments`
    );
  }
};

const tournamentsKnockoutRoundsSyncHandler: CronTargetHandler = async () => {
  const batchResult = await runKnockoutRoundsSyncBatch();
  const tournaments = batchResult.results.map(result => ({
    tournamentId: result.tournamentId,
    tournamentLabel: result.tournamentLabel,
    createdRounds: result.result.summary.createdRounds,
    createdMatches: result.result.summary.createdMatches,
    status: result.status,
  }));

  Logger.audit(`[CRON_TARGET:tournaments.knockout_rounds_sync]`, {
    summary: batchResult.summary,
    tournaments,
  });

  if (batchResult.summary.failedTournaments > 0) {
    throw new Error(
      `Knockout rounds sync failed for ${batchResult.summary.failedTournaments}/${batchResult.summary.queuedTournaments} tournaments`
    );
  }
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGET_IDS.MATCHES_SYNC_OPEN]: matchesSyncOpenHandler,
  [CRON_TARGET_IDS.MATCHES_SYNC_ENDED]: matchesSyncEndedHandler,
  [CRON_TARGET_IDS.SCOREBOARD_APPLY_PENDING_TOURNAMENTS]: scoreboardApplyPendingTournamentsHandler,
  [CRON_TARGET_IDS.TOURNAMENTS_CURRENT_ROUND_SYNC]: tournamentsCurrentRoundSyncHandler,
  [CRON_TARGET_IDS.TOURNAMENTS_KNOCKOUT_ROUNDS_SYNC]: tournamentsKnockoutRoundsSyncHandler,
};

const isValidTarget = (target: string): boolean => !!CRON_TARGET_REGISTRY[target];

const executeRunTarget = async (run: DB_SelectCronJobRun): Promise<void> => {
  const handler = CRON_TARGET_REGISTRY[run.target];
  if (!handler) {
    throw new Error(`No handler registered for target "${run.target}"`);
  }

  await handler({
    runId: run.id,
    jobDefinitionId: run.jobDefinitionId,
    jobKey: run.jobKey,
    jobVersion: run.jobVersion,
    target: run.target,
    triggerType: run.triggerType as ICronRunTriggerType,
    scheduledAt: run.scheduledAt,
    payload: run.payloadSnapshot as CronTargetPayload,
  });
};

export const CRON_EXECUTOR_SERVICE = {
  isValidTarget,
  executeRunTarget,
};
