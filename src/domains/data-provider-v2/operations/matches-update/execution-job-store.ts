import type { TournamentMatchesUpdateSummary } from '@/domains/data-provider-v2/contracts/matches';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const MATCHES_UPDATE_EXECUTION_OPERATION_TYPE = 'matches_update_v2' as const;

export type MatchesUpdateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type MatchesUpdateExecutionJobFinalStatus = Exclude<MatchesUpdateExecutionJobStatus, 'in_progress'>;

export type MatchesUpdateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof MATCHES_UPDATE_EXECUTION_OPERATION_TYPE;
  status: MatchesUpdateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentMatchesUpdateSummary | null;
};

export const createMatchesUpdateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<MatchesUpdateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: MATCHES_UPDATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeMatchesUpdateExecutionJob = async (input: {
  requestId: string;
  status: MatchesUpdateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentMatchesUpdateSummary;
}): Promise<MatchesUpdateExecutionJob | null> => {
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

export const failMatchesUpdateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentMatchesUpdateSummary;
}): Promise<MatchesUpdateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): MatchesUpdateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: MATCHES_UPDATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as MatchesUpdateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentMatchesUpdateSummary | null) ?? null,
  };
};
