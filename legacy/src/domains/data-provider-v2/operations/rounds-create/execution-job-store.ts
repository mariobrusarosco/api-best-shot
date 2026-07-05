import type { TournamentRoundsCreateSummary } from '@/domains/data-provider-v2/contracts/rounds';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const ROUNDS_CREATE_EXECUTION_OPERATION_TYPE = 'rounds_create_v2' as const;

export type RoundsCreateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type RoundsCreateExecutionJobFinalStatus = Exclude<RoundsCreateExecutionJobStatus, 'in_progress'>;

export type RoundsCreateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof ROUNDS_CREATE_EXECUTION_OPERATION_TYPE;
  status: RoundsCreateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentRoundsCreateSummary | null;
};

export const createRoundsCreateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<RoundsCreateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: ROUNDS_CREATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeRoundsCreateExecutionJob = async (input: {
  requestId: string;
  status: RoundsCreateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentRoundsCreateSummary;
}): Promise<RoundsCreateExecutionJob | null> => {
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

export const failRoundsCreateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentRoundsCreateSummary;
}): Promise<RoundsCreateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): RoundsCreateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: ROUNDS_CREATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as RoundsCreateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentRoundsCreateSummary | null) ?? null,
  };
};
