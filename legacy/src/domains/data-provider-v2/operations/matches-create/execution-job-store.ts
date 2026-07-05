import type { TournamentMatchesCreateSummary } from '@/domains/data-provider-v2/contracts/matches';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const MATCHES_CREATE_EXECUTION_OPERATION_TYPE = 'matches_create_v2' as const;

export type MatchesCreateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type MatchesCreateExecutionJobFinalStatus = Exclude<MatchesCreateExecutionJobStatus, 'in_progress'>;

export type MatchesCreateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof MATCHES_CREATE_EXECUTION_OPERATION_TYPE;
  status: MatchesCreateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentMatchesCreateSummary | null;
};

export const createMatchesCreateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<MatchesCreateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: MATCHES_CREATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeMatchesCreateExecutionJob = async (input: {
  requestId: string;
  status: MatchesCreateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentMatchesCreateSummary;
}): Promise<MatchesCreateExecutionJob | null> => {
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

export const failMatchesCreateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentMatchesCreateSummary;
}): Promise<MatchesCreateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): MatchesCreateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: MATCHES_CREATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as MatchesCreateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentMatchesCreateSummary | null) ?? null,
  };
};
