import type { TournamentRoundsUpdateSummary } from '@/domains/data-provider-v2/contracts/rounds';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE = 'rounds_update_v2' as const;

export type RoundsUpdateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type RoundsUpdateExecutionJobFinalStatus = Exclude<RoundsUpdateExecutionJobStatus, 'in_progress'>;

export type RoundsUpdateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE;
  status: RoundsUpdateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentRoundsUpdateSummary | null;
};

export const createRoundsUpdateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<RoundsUpdateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeRoundsUpdateExecutionJob = async (input: {
  requestId: string;
  status: RoundsUpdateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentRoundsUpdateSummary;
}): Promise<RoundsUpdateExecutionJob | null> => {
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

export const failRoundsUpdateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentRoundsUpdateSummary;
}): Promise<RoundsUpdateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): RoundsUpdateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as RoundsUpdateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentRoundsUpdateSummary | null) ?? null,
  };
};
