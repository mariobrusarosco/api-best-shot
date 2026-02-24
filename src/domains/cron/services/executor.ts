import Logger from '@/core/logger';
import { DB_SelectCronJobRun } from '@/domains/cron/schema';
import { ICronRunTriggerType } from '@/domains/cron/typing';

const CRON_TARGET_IDS = {
  SYSTEM_PRINT_MESSAGE: 'system.print_message',
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

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGET_IDS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
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
