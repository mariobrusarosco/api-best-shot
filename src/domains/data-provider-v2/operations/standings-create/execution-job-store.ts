import db from '@/core/database';
import { T_DataProviderExecutions } from '@/core/database/schema';
import type { TournamentStandingsCreateSummary } from '@/domains/data-provider-v2/contracts/standings';
import { eq } from 'drizzle-orm';

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
  const [executionJob] = await db
    .insert(T_DataProviderExecutions)
    .values({
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      operationType: STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
      status: 'in_progress',
      startedAt: input.startedAt ?? new Date(),
    })
    .returning();

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
  const completedAt = input.completedAt ?? new Date();

  const [executionJob] = await db
    .update(T_DataProviderExecutions)
    .set({
      status: input.status,
      completedAt,
      duration: input.duration,
      reportFileUrl: input.reportFileUrl,
      reportFileKey: input.reportFileKey,
      summary: input.summary,
      updatedAt: completedAt,
    })
    .where(eq(T_DataProviderExecutions.requestId, input.requestId))
    .returning();

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
  return finalizeStandingsCreateExecutionJob({
    ...input,
    status: 'failed',
  });
};

const mapExecutionJob = (executionJob: typeof T_DataProviderExecutions.$inferSelect): StandingsCreateExecutionJob => {
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
