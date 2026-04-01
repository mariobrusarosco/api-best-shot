import type { CurrentRoundSyncSummary } from '@/domains/data-provider-v2/contracts/current-round-sync';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE = 'tournament_current_round_sync_v2' as const;

export type CurrentRoundSyncExecutionJobStatus = 'in_progress' | 'completed' | 'failed';
export type CurrentRoundSyncExecutionJobFinalStatus = Exclude<CurrentRoundSyncExecutionJobStatus, 'in_progress'>;

export type CurrentRoundSyncExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE;
  status: CurrentRoundSyncExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: CurrentRoundSyncSummary | null;
};

export const createCurrentRoundSyncExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<CurrentRoundSyncExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeCurrentRoundSyncExecutionJob = async (input: {
  requestId: string;
  status: CurrentRoundSyncExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: CurrentRoundSyncSummary;
}): Promise<CurrentRoundSyncExecutionJob | null> => {
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

export const failCurrentRoundSyncExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: CurrentRoundSyncSummary;
}): Promise<CurrentRoundSyncExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): CurrentRoundSyncExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as CurrentRoundSyncExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as CurrentRoundSyncSummary | null) ?? null,
  };
};
