import type { TournamentTeamsCreateSummary } from '@/domains/data-provider-v2/contracts/teams';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const TEAMS_CREATE_EXECUTION_OPERATION_TYPE = 'teams_create_v2' as const;

export type TeamsCreateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type TeamsCreateExecutionJobFinalStatus = Exclude<TeamsCreateExecutionJobStatus, 'in_progress'>;

export type TeamsCreateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof TEAMS_CREATE_EXECUTION_OPERATION_TYPE;
  status: TeamsCreateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentTeamsCreateSummary | null;
};

export const createTeamsCreateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<TeamsCreateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: TEAMS_CREATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeTeamsCreateExecutionJob = async (input: {
  requestId: string;
  status: TeamsCreateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentTeamsCreateSummary;
}): Promise<TeamsCreateExecutionJob | null> => {
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

export const failTeamsCreateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentTeamsCreateSummary;
}): Promise<TeamsCreateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): TeamsCreateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: TEAMS_CREATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as TeamsCreateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentTeamsCreateSummary | null) ?? null,
  };
};
