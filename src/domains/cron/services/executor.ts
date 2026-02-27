import Logger from '@/core/logger';
import { DB_SelectCronJobRun } from '@/domains/cron/schema';
import { ICronRunTriggerType } from '@/domains/cron/typing';
import { SERVICES_DATA_PROVIDER_KNOCKOUT_ROUNDS_SYNC } from '@/domains/data-provider/services/knockout-rounds-sync';
import { SERVICES_DATA_PROVIDER_MATCH_SYNC } from '@/domains/data-provider/services/matches-sync';
import { TournamentDataProvider } from '@/domains/data-provider/services/tournaments';
import { MatchQueries } from '@/domains/match/queries';

import { CRON_TARGET_IDS } from '@/domains/cron/constants';

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

const systemPrintMessageHandler: CronTargetHandler = async context => {
  const payload = (context.payload || {}) as Record<string, unknown>;
  const rawMessage = payload['message'];
  const message =
    typeof rawMessage === 'string' && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : `[CRON] ${context.jobKey}#${context.jobVersion} executed`;

  Logger.info(
    `[CRON_TARGET:system.print_message] run=${context.runId} job=${context.jobKey}#${context.jobVersion} ${message}`
  );
};

const matchesSyncOpenHandler: CronTargetHandler = async context => {
  const summary = await SERVICES_DATA_PROVIDER_MATCH_SYNC.syncOpenMatchesFromProvider();
  // TODO(realtime): Emit a WebSocket event here so clients can refresh match/tournament views without polling.

  Logger.info(
    `[CRON_TARGET:matches.sync_open] run=${context.runId} job=${context.jobKey}#${context.jobVersion} scanned=${summary.scanned} updated=${summary.updated} ended=${summary.ended} open=${summary.open} notDefined=${summary.notDefined} failed=${summary.failed}`
  );
};

const tournamentsCurrentRoundSyncHandler: CronTargetHandler = async context => {
  const todayMatches = await MatchQueries.currentDayMatchesOnDatabase();
  const uniqueTournamentIds = new Set(todayMatches.map(match => match.tournamentId).filter(Boolean));
  const { results, failures } = await TournamentDataProvider.syncCurrentRoundsForTournamentIds([
    ...uniqueTournamentIds,
  ]);

  for (const result of results) {
    Logger.info(
      `[CRON_TARGET:tournaments.current_round_sync] run=${context.runId} job=${context.jobKey}#${context.jobVersion} requestId=${result.requestId} tournament=${result.tournamentSlug} currentRoundSlug=${result.currentRoundSlug} roundsCount=${result.roundsCount}`
    );
  }

  if (failures.length > 0) {
    const failureMessages: string[] = [];

    for (const failure of failures) {
      const message = failure.error.message || String(failure.error);
      failureMessages.push(`tournamentId=${failure.tournamentId} requestId=${failure.requestId} error=${message}`);
    }

    throw new Error(
      `Current round sync failed for ${failures.length}/${uniqueTournamentIds.size} tournaments: ${failureMessages.join(' | ')}`
    );
  }
};

const tournamentsKnockoutRoundsSyncHandler: CronTargetHandler = async context => {
  const summary = await SERVICES_DATA_PROVIDER_KNOCKOUT_ROUNDS_SYNC.syncEligibleTournamentsKnockoutRounds();

  Logger.info(
    `[CRON_TARGET:tournaments.knockout_rounds_sync] run=${context.runId} job=${context.jobKey}#${context.jobVersion} scannedTournaments=${summary.scannedTournaments} failedTournaments=${summary.failedTournaments.length}`
  );

  if (summary.failedTournaments.length > 0) {
    const failures = summary.failedTournaments
      .map(failure => `tournamentId=${failure.tournamentId} error=${failure.error}`)
      .join(' | ');
    throw new Error(
      `Knockout rounds sync failed for ${summary.failedTournaments.length}/${summary.scannedTournaments} tournaments: ${failures}`
    );
  }
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGET_IDS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
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
