import type { TournamentStandingsUpdateSummary } from '@/domains/data-provider-v2/contracts/standings';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE = 'standings_update_v2' as const;

export type StandingsUpdateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type StandingsUpdateExecutionJobFinalStatus = Exclude<StandingsUpdateExecutionJobStatus, 'in_progress'>;

export type StandingsUpdateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string | null;
  operationType: typeof STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE;
  status: StandingsUpdateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentStandingsUpdateSummary | null;
};

export const createStandingsUpdateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<StandingsUpdateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeStandingsUpdateExecutionJob = async (input: {
  requestId: string;
  status: StandingsUpdateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentStandingsUpdateSummary;
}): Promise<StandingsUpdateExecutionJob | null> => {
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

export const failStandingsUpdateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentStandingsUpdateSummary;
}): Promise<StandingsUpdateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): StandingsUpdateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as StandingsUpdateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentStandingsUpdateSummary | null) ?? null,
  };
};
