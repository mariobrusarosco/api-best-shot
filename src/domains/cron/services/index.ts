import { QUERIES_CRON_JOB_DEFINITIONS, QUERIES_CRON_JOB_RUNS } from '@/domains/cron/queries';
import {
  DB_InsertCronJobDefinition,
  DB_InsertCronJobRun,
  DB_SelectCronJobDefinition,
  DB_SelectCronJobRun,
} from '@/domains/cron/schema';
import {
  CRON_JOB_SCHEDULE_TYPES,
  CRON_RUN_TRIGGER_TYPES,
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
  'id' | 'version' | 'createdAt' | 'updatedAt'
> & {
  version?: number;
};

type QueueRunOutcome = 'pending' | 'skipped' | 'duplicate';

type QueueRunResult = {
  outcome: QueueRunOutcome;
  run: DB_SelectCronJobRun | null;
};

type MarkRunFailedInput = {
  failureCode: string;
  failureMessage: string;
  failureDetails?: Record<string, unknown> | null;
};

type FailStaleRunningRunsInput = {
  staleBefore: Date;
  limit?: number;
  failureCode: string;
  failureMessage: string;
  failureDetails?: Record<string, unknown> | null;
};

const PAUSE_REASON_MIN_LENGTH = 5;
const PAUSE_REASON_MAX_LENGTH = 300;

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

const assertDefinitionIsRunnable = (definition: DB_SelectCronJobDefinition): void => {
  if (definition.status === 'retired') {
    throw new Error(`Cron definition "${definition.id}" is retired`);
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

const getLatestDefinitionByJobKey = async (jobKey: string): Promise<DB_SelectCronJobDefinition | null> => {
  return QUERIES_CRON_JOB_DEFINITIONS.getLatestDefinitionByJobKey(jobKey);
};

const listDefinitions = async (options?: ListCronDefinitionsOptions): Promise<DB_SelectCronJobDefinition[]> => {
  return QUERIES_CRON_JOB_DEFINITIONS.listDefinitions(options);
};

const normalizePauseReason = (reason: string): string => {
  const normalized = reason.trim();

  if (normalized.length < PAUSE_REASON_MIN_LENGTH) {
    throw new Error(`Pause reason must be at least ${PAUSE_REASON_MIN_LENGTH} characters`);
  }

  if (normalized.length > PAUSE_REASON_MAX_LENGTH) {
    throw new Error(`Pause reason must be at most ${PAUSE_REASON_MAX_LENGTH} characters`);
  }

  return normalized;
};

const pauseDefinition = async (
  id: string,
  reason: string,
  updatedBy: string = 'system'
): Promise<DB_SelectCronJobDefinition> => {
  const normalizedReason = normalizePauseReason(reason);
  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(id);

  if (!definition) {
    throw new Error(`Cron definition "${id}" not found`);
  }

  const updated = await QUERIES_CRON_JOB_DEFINITIONS.pauseDefinition(id, normalizedReason, updatedBy);
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

  // v1 behavior: resume clears pause reason.
  const updated = await QUERIES_CRON_JOB_DEFINITIONS.resumeDefinition(id, updatedBy);
  if (!updated) {
    throw new Error(`Failed to resume cron definition "${id}"`);
  }

  return updated;
};

const buildRunInsert = (params: {
  definition: DB_SelectCronJobDefinition;
  triggerType: ICronRunTriggerType;
  scheduledAt: Date;
  payloadSnapshot: CronTargetPayload;
  status: DB_InsertCronJobRun['status'];
  failureCode?: string;
  failureMessage?: string;
  failureDetails?: Record<string, unknown> | null;
}): DB_InsertCronJobRun => {
  const now = new Date();

  return {
    jobDefinitionId: params.definition.id,
    jobKey: params.definition.jobKey,
    jobVersion: params.definition.version,
    target: params.definition.target,
    payloadSnapshot: params.payloadSnapshot,
    triggerType: params.triggerType,
    scheduledAt: params.scheduledAt,
    status: params.status,
    startedAt: params.status === 'pending' ? null : now,
    finishedAt: params.status === 'pending' ? null : now,
    failureCode: params.failureCode,
    failureMessage: params.failureMessage,
    failureDetails: params.failureDetails || null,
  };
};

const insertRunByTrigger = async (
  triggerType: ICronRunTriggerType,
  run: DB_InsertCronJobRun
): Promise<DB_SelectCronJobRun | null> => {
  if (triggerType === CRON_RUN_TRIGGER_TYPES.SCHEDULED) {
    return QUERIES_CRON_JOB_RUNS.createScheduledRunIfMissing(run);
  }

  return QUERIES_CRON_JOB_RUNS.createRun(run);
};

const queueRunWithOverlapPolicy = async (params: {
  jobDefinitionId: string;
  triggerType: ICronRunTriggerType;
  scheduledAt?: Date;
  payloadSnapshot?: CronTargetPayload;
}): Promise<QueueRunResult> => {
  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(params.jobDefinitionId);
  if (!definition) {
    throw new Error(`Cron definition "${params.jobDefinitionId}" not found`);
  }

  assertDefinitionIsRunnable(definition);

  // Pause semantics:
  // - only active definitions can queue new runs
  if (definition.status !== 'active') {
    return {
      outcome: 'skipped',
      run: null,
    };
  }

  const scheduledAt = params.scheduledAt || new Date();
  const payloadSnapshot = params.payloadSnapshot ?? (definition.payload as CronTargetPayload);
  const hasActiveRun = await QUERIES_CRON_JOB_RUNS.hasActiveRunByDefinitionVersion(definition.id, definition.version);

  if (hasActiveRun) {
    const skippedRun = await insertRunByTrigger(
      params.triggerType,
      buildRunInsert({
        definition,
        triggerType: params.triggerType,
        scheduledAt,
        payloadSnapshot,
        status: 'skipped',
        failureCode: 'overlap_skipped',
        failureMessage: 'Run skipped due to overlap policy',
      })
    );

    return {
      outcome: skippedRun ? 'skipped' : 'duplicate',
      run: skippedRun,
    };
  }

  const pendingRun = await insertRunByTrigger(
    params.triggerType,
    buildRunInsert({
      definition,
      triggerType: params.triggerType,
      scheduledAt,
      payloadSnapshot,
      status: 'pending',
    })
  );

  return {
    outcome: pendingRun ? 'pending' : 'duplicate',
    run: pendingRun,
  };
};

const queueScheduledRun = async (jobDefinitionId: string, scheduledAt: Date): Promise<QueueRunResult> => {
  return queueRunWithOverlapPolicy({
    jobDefinitionId,
    triggerType: CRON_RUN_TRIGGER_TYPES.SCHEDULED,
    scheduledAt,
  });
};

const queueRunNow = async (jobDefinitionId: string, payloadSnapshot?: CronTargetPayload): Promise<QueueRunResult> => {
  return queueRunWithOverlapPolicy({
    jobDefinitionId,
    triggerType: CRON_RUN_TRIGGER_TYPES.MANUAL,
    scheduledAt: new Date(),
    payloadSnapshot,
  });
};

const listPendingRuns = async (limit: number = 100): Promise<DB_SelectCronJobRun[]> => {
  return QUERIES_CRON_JOB_RUNS.listPendingRuns(limit);
};

const markRunRunning = async (runId: string, runnerInstanceId?: string): Promise<DB_SelectCronJobRun> => {
  const updated = await QUERIES_CRON_JOB_RUNS.markRunning(runId, runnerInstanceId);
  if (!updated) {
    throw new Error(`Run "${runId}" is not pending or does not exist`);
  }

  return updated;
};

const markRunSucceeded = async (runId: string): Promise<DB_SelectCronJobRun> => {
  const updated = await QUERIES_CRON_JOB_RUNS.markSucceeded(runId);
  if (!updated) {
    throw new Error(`Run "${runId}" is not running or does not exist`);
  }

  return updated;
};

const markRunFailed = async (runId: string, failure: MarkRunFailedInput): Promise<DB_SelectCronJobRun> => {
  const updated = await QUERIES_CRON_JOB_RUNS.markFailed(runId, failure);
  if (!updated) {
    throw new Error(`Run "${runId}" is not running or does not exist`);
  }

  return updated;
};

const failStaleRunningRuns = async (input: FailStaleRunningRunsInput): Promise<DB_SelectCronJobRun[]> => {
  return QUERIES_CRON_JOB_RUNS.markStaleRunningRunsAsFailed(
    input.staleBefore,
    {
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
      failureDetails: input.failureDetails || null,
    },
    input.limit
  );
};

const retireOneTimeDefinitionAfterSuccess = async (run: DB_SelectCronJobRun): Promise<void> => {
  if (run.status !== 'succeeded') return;

  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(run.jobDefinitionId);
  if (!definition) return;
  if (definition.scheduleType !== CRON_JOB_SCHEDULE_TYPES.ONE_TIME) return;
  if (definition.status === 'retired') return;

  try {
    await QUERIES_CRON_JOB_DEFINITIONS.updateDefinition(definition.id, {
      status: 'retired',
      pauseReason: null,
      updatedBy: 'scheduler',
    });
  } catch {
    // Best effort; run terminal state is already persisted.
  }
};

const executePendingRun = async (runId: string, runnerInstanceId?: string): Promise<DB_SelectCronJobRun> => {
  const runningRun = await markRunRunning(runId, runnerInstanceId);
  const handler = resolveTargetHandler(runningRun.target);

  if (!handler) {
    return markRunFailed(runId, {
      failureCode: 'unknown_target',
      failureMessage: `No handler registered for target "${runningRun.target}"`,
      failureDetails: {
        target: runningRun.target,
      },
    });
  }

  try {
    await handler({
      runId: runningRun.id,
      jobDefinitionId: runningRun.jobDefinitionId,
      jobKey: runningRun.jobKey,
      jobVersion: runningRun.jobVersion,
      target: runningRun.target,
      triggerType: runningRun.triggerType as ICronRunTriggerType,
      scheduledAt: runningRun.scheduledAt,
      payload: runningRun.payloadSnapshot as CronTargetPayload,
    });

    const terminalRun = await markRunSucceeded(runId);
    await retireOneTimeDefinitionAfterSuccess(terminalRun);
    return terminalRun;
  } catch (error) {
    const err = error as Error;
    return markRunFailed(runId, {
      failureCode: 'target_execution_failed',
      failureMessage: err.message || 'Unhandled target execution failure',
      failureDetails: {
        name: err.name,
        stack: err.stack,
      },
    });
  }
};

export const SERVICES_CRON = {
  listTargets,
  isValidTarget,
  resolveTargetHandler,
  createDefinition,
  getDefinitionById,
  getLatestDefinitionByJobKey,
  listDefinitions,
  pauseDefinition,
  resumeDefinition,
  queueScheduledRun,
  queueRunNow,
  listPendingRuns,
  markRunRunning,
  markRunSucceeded,
  markRunFailed,
  failStaleRunningRuns,
  executePendingRun,
};
