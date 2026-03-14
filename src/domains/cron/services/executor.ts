import Logger from '@/core/logger';
import { CRON_TARGET_IDS } from '@/domains/cron/constants';
import type { DB_SelectCronJobRun } from '@/domains/cron/schema';
import type { ICronRunTriggerType } from '@/domains/cron/typing';
import { SERVICES_DATA_PROVIDER_MATCH_SYNC } from '@/domains/data-provider/services/matches-sync';
import { RoundsDataProviderService } from '@/domains/data-provider/services/rounds';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { TournamentDataProvider } from '@/domains/data-provider/services/tournaments';
import { MatchQueries } from '@/domains/match/queries';

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
  const { failures, results } = await TournamentDataProvider.syncCurrentRoundsForTournamentIds([
    ...uniqueTournamentIds,
  ]);

  const tournaments = results.map(result => ({
    tournamentSlug: result.tournamentSlug,
    currentRoundSlug: result.currentRoundSlug,
  }));

  Logger.audit(`[CRON_TARGET:tournaments.current_round_sync]`, { todayMatches, tournaments });

  if (failures.length > 0) {
    throw new Error(`Current round sync failed for ${failures.length}/${uniqueTournamentIds.size} tournaments`);
  }
};

const tournamentsKnockoutRoundsSyncHandler: CronTargetHandler = async () => {
  const summary = await RoundsDataProviderService.updateKnockouts();

  Logger.audit(`[CRON_TARGET:tournaments.knockout_rounds_sync]`, summary);

  if (summary.failedTournaments.length > 0) {
    const failures = summary.failedTournaments
      .map(failure => `tournamentSlug=${failure.tournamentSlug} error=${failure.error}`)
      .join(' | ');
    throw new Error(`Knockout rounds sync failed for ${summary.failedTournaments.length} tournaments: ${failures}`);
  }
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGET_IDS.MATCHES_SYNC_OPEN]: matchesSyncOpenHandler,
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
