import type { KnockoutRoundsSyncSummary } from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE = 'tournament_knockout_rounds_sync_v2' as const;

export type KnockoutRoundsSyncExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type KnockoutRoundsSyncExecutionJobFinalStatus = Exclude<KnockoutRoundsSyncExecutionJobStatus, 'in_progress'>;

export type KnockoutRoundsSyncExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE;
  status: KnockoutRoundsSyncExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: KnockoutRoundsSyncSummary | null;
};

export const createKnockoutRoundsSyncExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<KnockoutRoundsSyncExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeKnockoutRoundsSyncExecutionJob = async (input: {
  requestId: string;
  status: KnockoutRoundsSyncExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: KnockoutRoundsSyncSummary;
}): Promise<KnockoutRoundsSyncExecutionJob | null> => {
  const executionJob = await finalizeExecutionJob({
    requestId: input.requestId,
    status: input.status,
    completedAt: input.completedAt,
    duration: input.duration,
    reportFileUrl: input.reportFileUrl,
    reportFileKey: input.reportFileKey,
    summary: input.summary,
  });

  return executionJob ? mapExecutionJob(executionJob) : null;
};

export const failKnockoutRoundsSyncExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: KnockoutRoundsSyncSummary;
}): Promise<KnockoutRoundsSyncExecutionJob | null> => {
  const executionJob = await failExecutionJob({
    requestId: input.requestId,
    completedAt: input.completedAt,
    duration: input.duration,
    reportFileUrl: input.reportFileUrl,
    reportFileKey: input.reportFileKey,
    summary: input.summary,
  });

  return executionJob ? mapExecutionJob(executionJob) : null;
};

const mapExecutionJob = (executionJob: DataProviderExecutionRow): KnockoutRoundsSyncExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as KnockoutRoundsSyncExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as KnockoutRoundsSyncSummary | null) ?? null,
  };
};
