import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { DB_SelectCronJobRun } from '@/domains/cron/schema';
import { ICronRunTriggerType } from '@/domains/cron/typing';

export const CRON_TARGETS = {
  SYSTEM_PRINT_MESSAGE: 'system.print_message',
} as const;

const systemPrintMessageHandler: CronTargetHandler = async context => {
  const payload = (context.payload || {}) as Record<string, unknown>;
  const rawMessage = payload['message'];
  const message =
    typeof rawMessage === 'string' && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : `[CRON] ${context.jobKey}#${context.jobVersion} executed`;

  Logger.info(`[CRON_TARGET:system.print_message] ${message}`, {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'cron-executor',
    operation: 'system_print_message',
    runId: context.runId,
    jobDefinitionId: context.jobDefinitionId,
    jobKey: context.jobKey,
    jobVersion: context.jobVersion,
  });
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGETS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
};

const listTargets = (): string[] => Object.keys(CRON_TARGET_REGISTRY);

const isValidTarget = (target: string): boolean => !!CRON_TARGET_REGISTRY[target];

const resolveTargetHandler = (target: string): CronTargetHandler | null => {
  return CRON_TARGET_REGISTRY[target] || null;
};

const executeTarget = async (context: CronTargetHandlerContext): Promise<void> => {
  const handler = resolveTargetHandler(context.target);

  if (!handler) {
    throw new Error(`No handler registered for target "${context.target}"`);
  }

  await handler(context);
};

const executeRunTarget = async (run: DB_SelectCronJobRun): Promise<void> => {
  await executeTarget({
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
  listTargets,
  isValidTarget,
  resolveTargetHandler,
  executeTarget,
  executeRunTarget,
};

export type CronTargetPayload = Record<string, unknown> | null | undefined;

export type CronTargetHandlerContext = {
  runId: string;
  jobDefinitionId: string;
  jobKey: string;
  jobVersion: number;
  target: string;
  triggerType: ICronRunTriggerType;
  scheduledAt: Date;
  payload: CronTargetPayload;
};

export type CronTargetHandler = (context: CronTargetHandlerContext) => Promise<void>;
