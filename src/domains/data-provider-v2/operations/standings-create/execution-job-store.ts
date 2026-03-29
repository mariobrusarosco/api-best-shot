import type { TournamentStandingsCreateSummary } from '@/domains/data-provider-v2/contracts/standings';
import {
  createExecutionJob,
  failExecutionJob,
  finalizeExecutionJob,
  type DataProviderExecutionRow,
} from '@/domains/data-provider-v2/operations/shared/execution-job-store';

export const STANDINGS_CREATE_EXECUTION_OPERATION_TYPE = 'standings_create_v2' as const;

export type StandingsCreateExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';
export type StandingsCreateExecutionJobFinalStatus = Exclude<StandingsCreateExecutionJobStatus, 'in_progress'>;

export type StandingsCreateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string | null;
  operationType: typeof STANDINGS_CREATE_EXECUTION_OPERATION_TYPE;
  status: StandingsCreateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentStandingsCreateSummary | null;
};

export const createStandingsCreateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<StandingsCreateExecutionJob> => {
  const executionJob = await createExecutionJob({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
    startedAt: input.startedAt,
  });

  return mapExecutionJob(executionJob);
};

export const finalizeStandingsCreateExecutionJob = async (input: {
  requestId: string;
  status: StandingsCreateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentStandingsCreateSummary;
}): Promise<StandingsCreateExecutionJob | null> => {
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

export const failStandingsCreateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentStandingsCreateSummary;
}): Promise<StandingsCreateExecutionJob | null> => {
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

const mapExecutionJob = (executionJob: DataProviderExecutionRow): StandingsCreateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as StandingsCreateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentStandingsCreateSummary | null) ?? null,
  };
};
