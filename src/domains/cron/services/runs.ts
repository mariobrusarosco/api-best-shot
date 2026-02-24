import { QUERIES_CRON_JOB_DEFINITIONS, QUERIES_CRON_JOB_RUNS } from '@/domains/cron/queries';
import { DB_InsertCronJobRun, DB_SelectCronJobDefinition, DB_SelectCronJobRun } from '@/domains/cron/schema';
import { CRON_JOB_SCHEDULE_TYPES, CRON_RUN_TRIGGER_TYPES, ICronRunTriggerType } from '@/domains/cron/typing';
import { CRON_EXECUTOR_SERVICE, CronTargetPayload } from './executor';

const buildRunRecordInput = (params: {
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

const createRunRecord = async (
  triggerType: ICronRunTriggerType,
  run: DB_InsertCronJobRun
): Promise<DB_SelectCronJobRun | null> => {
  if (triggerType === CRON_RUN_TRIGGER_TYPES.SCHEDULED) {
    return QUERIES_CRON_JOB_RUNS.createScheduledRunIfMissing(run);
  }

  return QUERIES_CRON_JOB_RUNS.createRun(run);
};

const queueRunForActiveDefinition = async (params: {
  jobDefinitionId: string;
  triggerType: ICronRunTriggerType;
  scheduledAt?: Date;
  payloadSnapshot?: CronTargetPayload;
}): Promise<QueueRunResult> => {
  const definition = await QUERIES_CRON_JOB_DEFINITIONS.getDefinitionById(params.jobDefinitionId);
  if (!definition) {
    throw new Error(`Cron definition "${params.jobDefinitionId}" not found`);
  }

  if (definition.status !== 'active') {
    return {
      outcome: 'skipped',
      run: null,
    };
  }

  const scheduledAt = params.scheduledAt || new Date();
  const payloadSnapshot = params.payloadSnapshot ?? (definition.payload as CronTargetPayload);
  const hasRunningRunForDefinitionVersion = await QUERIES_CRON_JOB_RUNS.hasActiveRunByDefinitionVersion(
    definition.id,
    definition.version
  );

  if (hasRunningRunForDefinitionVersion) {
    const skippedRun = await createRunRecord(
      params.triggerType,
      buildRunRecordInput({
        definition,
        triggerType: params.triggerType,
        scheduledAt,
        payloadSnapshot,
        status: 'skipped',
        failureCode: 'skipped_due_duplication',
        failureMessage: 'Run skipped because another run is already running for this job version',
      })
    );

    return {
      outcome: skippedRun ? 'skipped' : 'duplicate',
      run: skippedRun,
    };
  }

  const pendingRun = await createRunRecord(
    params.triggerType,
    buildRunRecordInput({
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
  return queueRunForActiveDefinition({
    jobDefinitionId,
    triggerType: CRON_RUN_TRIGGER_TYPES.SCHEDULED,
    scheduledAt,
  });
};

const queueRunNow = async (jobDefinitionId: string, payloadSnapshot?: CronTargetPayload): Promise<QueueRunResult> => {
  return queueRunForActiveDefinition({
    jobDefinitionId,
    triggerType: CRON_RUN_TRIGGER_TYPES.MANUAL,
    scheduledAt: new Date(),
    payloadSnapshot,
  });
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

const skipPendingRuns = async (input: MarkRunsSkippedInput): Promise<DB_SelectCronJobRun[]> => {
  return QUERIES_CRON_JOB_RUNS.markPendingRunsAsSkipped({
    failureCode: input.failureCode,
    failureMessage: input.failureMessage,
    failureDetails: input.failureDetails || null,
  });
};

const skipRunningRuns = async (input: MarkRunsSkippedInput): Promise<DB_SelectCronJobRun[]> => {
  return QUERIES_CRON_JOB_RUNS.markRunningRunsAsSkipped({
    failureCode: input.failureCode,
    failureMessage: input.failureMessage,
    failureDetails: input.failureDetails || null,
  });
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
      updatedBy: 'scheduler',
    });
  } catch {
    // Best effort; run terminal state is already persisted.
  }
};

const executePendingRun = async (runId: string, runnerInstanceId?: string): Promise<DB_SelectCronJobRun> => {
  const runningRun = await markRunRunning(runId, runnerInstanceId);

  try {
    await CRON_EXECUTOR_SERVICE.executeRunTarget(runningRun);
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

export const CRON_RUN_SERVICE = {
  queueScheduledRun,
  queueRunNow,
  skipPendingRuns,
  skipRunningRuns,
  executePendingRun,
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

type MarkRunsSkippedInput = {
  failureCode: string;
  failureMessage: string;
  failureDetails?: Record<string, unknown> | null;
};
