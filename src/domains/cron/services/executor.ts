import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { DB_SelectCronJobRun } from '@/domains/cron/schema';
import { ICronRunTriggerType } from '@/domains/cron/typing';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { SERVICES_DATA_PROVIDER_MATCH_SYNC } from '@/domains/data-provider/services/matches-sync';
import { TournamentCurrentRoundDataProviderService } from '@/domains/data-provider/services/tournament-current-round';
import { MatchQueries } from '@/domains/match/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';

export const CRON_TARGET_IDS = {
  SYSTEM_PRINT_MESSAGE: 'system.print_message',
  MATCHES_SYNC_OPEN: 'matches.sync_open',
  TOURNAMENTS_CURRENT_ROUND_SYNC: 'tournaments.current_round_sync',
} as const;

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

  if (uniqueTournamentIds.size === 0) {
    Logger.info(`[CRON_TARGET:tournaments.current_round_sync] run=${context.runId} no tournaments with matches today`);
    return;
  }

  let scraper: BaseScraper | null = null;
  const failures: string[] = [];

  try {
    scraper = await BaseScraper.createInstance();

    for (const tournamentId of uniqueTournamentIds) {
      const requestId = randomUUID();

      try {
        const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
        const service = new TournamentCurrentRoundDataProviderService(scraper, requestId);
        const result = await service.init({
          tournamentId: tournament.id,
          baseUrl: tournament.baseUrl,
          label: tournament.label,
          provider: tournament.provider,
        });

        Logger.info(
          `[CRON_TARGET:tournaments.current_round_sync] run=${context.runId} job=${context.jobKey}#${context.jobVersion} requestId=${requestId} tournamentId=${result.tournamentId} currentRoundSlug=${result.currentRoundSlug} roundsCount=${result.roundsCount}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`tournamentId=${tournamentId} requestId=${requestId} error=${message}`);

        Logger.error(error as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'cron_executor',
          operation: 'tournaments_current_round_sync',
          runId: context.runId,
          requestId,
          tournamentId,
        });
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Current round sync failed for ${failures.length}/${uniqueTournamentIds.size} tournaments: ${failures.join(' | ')}`
      );
    }
  } finally {
    if (scraper) {
      await scraper.close();
    }
  }
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGET_IDS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
  [CRON_TARGET_IDS.MATCHES_SYNC_OPEN]: matchesSyncOpenHandler,
  [CRON_TARGET_IDS.TOURNAMENTS_CURRENT_ROUND_SYNC]: tournamentsCurrentRoundSyncHandler,
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
