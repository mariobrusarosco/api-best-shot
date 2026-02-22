import { QUERIES_CRON_JOB_DEFINITIONS } from '@/domains/cron/queries';
import { DB_InsertCronJobDefinition, DB_SelectCronJobDefinition } from '@/domains/cron/schema';
import {
  CRON_JOB_SCHEDULE_TYPES,
  ICronJobScheduleType,
  ICronRunTriggerType,
} from '@/domains/cron/typing';

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

type ListCronDefinitionsOptions = {
  jobKey?: string;
  status?: DB_SelectCronJobDefinition['status'];
  target?: string;
  scheduleType?: DB_SelectCronJobDefinition['scheduleType'];
  limit?: number;
  offset?: number;
};

type CreateCronDefinitionInput = Omit<
  DB_InsertCronJobDefinition,
  'id' | 'version' | 'supersedesJobId' | 'createdAt' | 'updatedAt'
> & {
  version?: number;
};

type CreateCronDefinitionVersionInput = Partial<
  Pick<
    DB_InsertCronJobDefinition,
    'target' | 'payload' | 'scheduleType' | 'cronExpression' | 'runAt' | 'timezone' | 'createdBy' | 'updatedBy'
  >
>;

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

const hasOwnProperty = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const hasValue = (value: unknown): boolean => value !== undefined && value !== null;

const validateScheduleShape = (definition: {
  scheduleType: ICronJobScheduleType;
  cronExpression?: unknown;
  runAt?: unknown;
}) => {
  if (definition.scheduleType === CRON_JOB_SCHEDULE_TYPES.ONE_TIME) {
    if (!hasValue(definition.runAt)) {
      throw new Error('One-time cron definitions must provide runAt');
    }
    if (hasValue(definition.cronExpression)) {
      throw new Error('One-time cron definitions cannot provide cronExpression');
    }
    return;
  }

  if (definition.scheduleType === CRON_JOB_SCHEDULE_TYPES.RECURRING) {
    if (!hasValue(definition.cronExpression)) {
      throw new Error('Recurring cron definitions must provide cronExpression');
    }
    if (hasValue(definition.runAt)) {
      throw new Error('Recurring cron definitions cannot provide runAt');
    }
    return;
  }

  throw new Error(`Unsupported schedule type "${definition.scheduleType}"`);
};

const ensureTargetIsValid = (target: string): void => {
  if (!isValidTarget(target)) {
    throw new Error(`Unsupported cron target "${target}"`);
  }
};

const createDefinition = async (input: CreateCronDefinitionInput): Promise<DB_SelectCronJobDefinition> => {
  ensureTargetIsValid(input.target);
  validateScheduleShape({
    scheduleType: input.scheduleType as ICronJobScheduleType,
    cronExpression: input.cronExpression,
    runAt: input.runAt,
  });

  const latest = await QUERIES_CRON_JOB_DEFINITIONS.getLatestDefinitionByJobKey(input.jobKey);
  if (latest) {
    throw new Error(`Job key "${input.jobKey}" already exists. Use new-version workflow.`);
  }

  if (input.version !== undefined && input.version !== 1) {
    throw new Error('Initial cron definition version must be 1');
  }

  const definitionToCreate: DB_InsertCronJobDefinition = {
    ...input,
    version: 1,
    status: input.status || 'active',
  };

  return QUERIES_CRON_JOB_DEFINITIONS.createDefinition(definitionToCreate);
};

const createNewVersion = async (
  currentDefinitionId: string,
  updates: CreateCronDefinitionVersionInput,
  updatedBy: string = 'system'
): Promise<{
  previous: DB_SelectCronJobDefinition | null;
  next: DB_SelectCronJobDefinition;
}> => {
  const current = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(currentDefinitionId);
  if (!current) {
    throw new Error(`Cron definition "${currentDefinitionId}" not found`);
  }

  if (current.status === 'retired') {
    throw new Error('Cannot create a new version from a retired definition');
  }

  const latest = await QUERIES_CRON_JOB_DEFINITIONS.getLatestDefinitionByJobKey(current.jobKey);
  if (!latest || latest.id !== current.id) {
    throw new Error('Only the latest definition version can be superseded');
  }

  const nextTarget = hasOwnProperty(updates, 'target') ? updates.target : current.target;
  const nextScheduleType = hasOwnProperty(updates, 'scheduleType')
    ? updates.scheduleType
    : current.scheduleType;
  const nextCronExpression = hasOwnProperty(updates, 'cronExpression')
    ? updates.cronExpression
    : current.cronExpression;
  const nextRunAt = hasOwnProperty(updates, 'runAt') ? updates.runAt : current.runAt;
  const nextPayload = hasOwnProperty(updates, 'payload') ? updates.payload : current.payload;
  const nextTimezone = hasOwnProperty(updates, 'timezone') ? updates.timezone : current.timezone;

  if (!nextTarget || !nextScheduleType || !nextTimezone) {
    throw new Error('New cron definition version is missing required fields');
  }

  ensureTargetIsValid(nextTarget);
  validateScheduleShape({
    scheduleType: nextScheduleType as ICronJobScheduleType,
    cronExpression: nextCronExpression,
    runAt: nextRunAt,
  });

  const nextVersionDefinition: DB_InsertCronJobDefinition = {
    jobKey: current.jobKey,
    version: current.version + 1,
    target: nextTarget,
    payload: nextPayload,
    scheduleType: nextScheduleType,
    cronExpression: nextCronExpression,
    runAt: nextRunAt,
    timezone: nextTimezone,
    status: 'active',
    createdBy: updates.createdBy || updatedBy,
    updatedBy: updates.updatedBy || updatedBy,
  };

  return QUERIES_CRON_JOB_DEFINITIONS.createNewVersion(currentDefinitionId, nextVersionDefinition, updatedBy);
};

const getDefinitionById = async (id: string): Promise<DB_SelectCronJobDefinition | null> => {
  return QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(id);
};

const getLatestDefinitionByJobKey = async (jobKey: string): Promise<DB_SelectCronJobDefinition | null> => {
  return QUERIES_CRON_JOB_DEFINITIONS.getLatestDefinitionByJobKey(jobKey);
};

const listDefinitions = async (options?: ListCronDefinitionsOptions): Promise<DB_SelectCronJobDefinition[]> => {
  return QUERIES_CRON_JOB_DEFINITIONS.listDefinitions(options);
};

export const SERVICES_CRON = {
  listTargets,
  isValidTarget,
  resolveTargetHandler,
  createDefinition,
  createNewVersion,
  getDefinitionById,
  getLatestDefinitionByJobKey,
  listDefinitions,
};
