import { QUERIES_CRON_JOB_DEFINITIONS } from '@/domains/cron/queries';
import { DB_InsertCronJobDefinition, DB_SelectCronJobDefinition } from '@/domains/cron/schema';
import { CRON_JOB_SCHEDULE_TYPES, ICronJobScheduleType } from '@/domains/cron/typing';
import { CRON_EXECUTOR_SERVICE } from './executor';

const MAX_RECURRING_DEFINITIONS = 50;

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
  if (!CRON_EXECUTOR_SERVICE.isValidTarget(target)) {
    throw new Error(`Unsupported cron target "${target}"`);
  }
};

const ensureRecurringDefinitionCapacity = async (): Promise<void> => {
  const recurringDefinitions = await QUERIES_CRON_JOB_DEFINITIONS.listDefinitions({
    scheduleType: CRON_JOB_SCHEDULE_TYPES.RECURRING,
    limit: MAX_RECURRING_DEFINITIONS + 1,
    offset: 0,
  });

  if (recurringDefinitions.length >= MAX_RECURRING_DEFINITIONS) {
    throw new Error(`Recurring jobs limit reached (${MAX_RECURRING_DEFINITIONS})`);
  }
};

const createDefinition = async (input: CreateCronDefinitionInput): Promise<DB_SelectCronJobDefinition> => {
  ensureTargetIsValid(input.target);
  validateScheduleShape({
    scheduleType: input.scheduleType as ICronJobScheduleType,
    cronExpression: input.cronExpression,
    runAt: input.runAt,
  });

  if (input.scheduleType === CRON_JOB_SCHEDULE_TYPES.RECURRING) {
    await ensureRecurringDefinitionCapacity();
  }

  const latest = await QUERIES_CRON_JOB_DEFINITIONS.getLatestDefinitionByJobKey(input.jobKey);
  if (latest) {
    throw new Error(`Job key "${input.jobKey}" already exists. Use a different job key.`);
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

const getDefinitionById = async (id: string): Promise<DB_SelectCronJobDefinition | null> => {
  return QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(id);
};

const listDefinitions = async (options?: ListCronDefinitionsOptions): Promise<DB_SelectCronJobDefinition[]> => {
  return QUERIES_CRON_JOB_DEFINITIONS.listDefinitions(options);
};

const pauseDefinition = async (id: string, updatedBy: string = 'system'): Promise<DB_SelectCronJobDefinition> => {
  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(id);

  if (!definition) {
    throw new Error(`Cron definition "${id}" not found`);
  }

  const updated = await QUERIES_CRON_JOB_DEFINITIONS.pauseDefinition(id, updatedBy);
  if (!updated) {
    throw new Error(`Failed to pause cron definition "${id}"`);
  }

  return updated;
};

const resumeDefinition = async (id: string, updatedBy: string = 'system'): Promise<DB_SelectCronJobDefinition> => {
  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(id);

  if (!definition) {
    throw new Error(`Cron definition "${id}" not found`);
  }

  const updated = await QUERIES_CRON_JOB_DEFINITIONS.resumeDefinition(id, updatedBy);
  if (!updated) {
    throw new Error(`Failed to resume cron definition "${id}"`);
  }

  return updated;
};

export const CRON_DEFINITION_SERVICE = {
  createDefinition,
  getDefinitionById,
  listDefinitions,
  pauseDefinition,
  resumeDefinition,
};

export type ListCronDefinitionsOptions = {
  jobKey?: string;
  status?: DB_SelectCronJobDefinition['status'];
  target?: string;
  scheduleType?: DB_SelectCronJobDefinition['scheduleType'];
  limit?: number;
  offset?: number;
};

export type CreateCronDefinitionInput = Omit<
  DB_InsertCronJobDefinition,
  'id' | 'version' | 'createdAt' | 'updatedAt'
> & {
  version?: number;
};
