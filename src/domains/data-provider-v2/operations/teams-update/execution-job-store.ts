import type { TournamentTeamsUpdateSummary } from '@/domains/data-provider-v2/contracts/teams';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const TEAMS_UPDATE_EXECUTION_OPERATION_TYPE = 'teams_update_v2' as const;

export type TeamsUpdateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type TeamsUpdateExecutionJobFinalStatus = Exclude<TeamsUpdateExecutionJobStatus, 'in_progress'>;

export type TeamsUpdateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof TEAMS_UPDATE_EXECUTION_OPERATION_TYPE;
  status: TeamsUpdateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentTeamsUpdateSummary | null;
};

export const createTeamsUpdateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<TeamsUpdateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: TEAMS_UPDATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeTeamsUpdateExecutionJob = async (input: {
  requestId: string;
  status: TeamsUpdateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentTeamsUpdateSummary;
}): Promise<TeamsUpdateExecutionJob | null> => {
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

export const failTeamsUpdateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentTeamsUpdateSummary;
}): Promise<TeamsUpdateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): TeamsUpdateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId ?? '',
    operationType: TEAMS_UPDATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as TeamsUpdateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentTeamsUpdateSummary | null) ?? null,
  };
};
