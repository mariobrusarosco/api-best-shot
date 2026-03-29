import db from '@/core/database';
import { T_DataProviderExecutions } from '@/core/database/schema';
import type { TournamentCreateSummary } from '@/domains/data-provider-v2/contracts/tournament-create';
import { eq } from 'drizzle-orm';

export const TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE = 'tournament_create_v2' as const;

const EMPTY_TOURNAMENT_ID: string | null = null;

export type TournamentCreateExecutionJobStatus = 'in_progress' | 'completed' | 'failed';
export type TournamentCreateExecutionJobFinalStatus = Exclude<TournamentCreateExecutionJobStatus, 'in_progress'>;

export type TournamentCreateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string | null;
  operationType: typeof TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE;
  status: TournamentCreateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentCreateSummary | null;
};

export const createTournamentCreateExecutionJob = async (input: {
  requestId: string;
  startedAt?: Date;
}): Promise<TournamentCreateExecutionJob> => {
  const [executionJob] = await db
    .insert(T_DataProviderExecutions)
    .values({
      requestId: input.requestId,
      tournamentId: EMPTY_TOURNAMENT_ID,
      operationType: TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE,
      status: 'in_progress',
      startedAt: input.startedAt ?? new Date(),
    })
    .returning();

  return mapExecutionJob(executionJob);
};

export const assignTournamentCreateExecutionJobTournament = async (input: {
  requestId: string;
  tournamentId: string;
}): Promise<TournamentCreateExecutionJob | null> => {
  const [executionJob] = await db
    .update(T_DataProviderExecutions)
    .set({
      tournamentId: input.tournamentId,
      updatedAt: new Date(),
    })
    .where(eq(T_DataProviderExecutions.requestId, input.requestId))
    .returning();

  return executionJob ? mapExecutionJob(executionJob) : null;
};

export const finalizeTournamentCreateExecutionJob = async (input: {
  requestId: string;
  status: TournamentCreateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentCreateSummary;
}): Promise<TournamentCreateExecutionJob | null> => {
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

export const failTournamentCreateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentCreateSummary;
}): Promise<TournamentCreateExecutionJob | null> => {
  return finalizeTournamentCreateExecutionJob({
    ...input,
    status: 'failed',
  });
};

const mapExecutionJob = (executionJob: typeof T_DataProviderExecutions.$inferSelect): TournamentCreateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as TournamentCreateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentCreateSummary | null) ?? null,
  };
};
