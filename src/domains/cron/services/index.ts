import { ICronRunTriggerType } from '@/domains/cron/typing';

type CronTargetPayload = Record<string, unknown> | null | undefined;

type CronTargetHandlerContext = {
  runId: string;
  jobDefinitionId: string;
  jobKey: string;
  jobVersion: number;
  target: string;
  triggerType: ICronRunTriggerType;
  scheduledAt: Date;
  payload: CronTargetPayload;
};

type CronTargetHandler = (context: CronTargetHandlerContext) => Promise<void>;

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

  console.log(`[CRON_TARGET:system.print_message] ${message}`);
};

const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGETS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
};

const listTargets = (): string[] => Object.keys(CRON_TARGET_REGISTRY);

const isValidTarget = (target: string): boolean => !!CRON_TARGET_REGISTRY[target];

const resolveTargetHandler = (target: string): CronTargetHandler | null => {
  return CRON_TARGET_REGISTRY[target] || null;
};

export const SERVICES_CRON = {
  listTargets,
  isValidTarget,
  resolveTargetHandler,
};
