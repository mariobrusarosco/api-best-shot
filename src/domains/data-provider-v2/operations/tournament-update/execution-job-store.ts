import db from '@/core/database';
import { T_DataProviderExecutions } from '@/core/database/schema';
import type { TournamentUpdateSummary } from '@/domains/data-provider-v2/contracts/tournament-update';
import { eq } from 'drizzle-orm';

export const TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE = 'tournament_update_v2' as const;

export type TournamentUpdateExecutionJobStatus = 'in_progress' | 'completed' | 'failed';
export type TournamentUpdateExecutionJobFinalStatus = Exclude<TournamentUpdateExecutionJobStatus, 'in_progress'>;

export type TournamentUpdateExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string | null;
  operationType: typeof TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE;
  status: TournamentUpdateExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentUpdateSummary | null;
};

export const createTournamentUpdateExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<TournamentUpdateExecutionJob> => {
  const [executionJob] = await db
    .insert(T_DataProviderExecutions)
    .values({
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      operationType: TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE,
      status: 'in_progress',
      startedAt: input.startedAt ?? new Date(),
    })
    .returning();

  return mapExecutionJob(executionJob);
};

export const finalizeTournamentUpdateExecutionJob = async (input: {
  requestId: string;
  status: TournamentUpdateExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentUpdateSummary;
}): Promise<TournamentUpdateExecutionJob | null> => {
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

export const failTournamentUpdateExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentUpdateSummary;
}): Promise<TournamentUpdateExecutionJob | null> => {
  return finalizeTournamentUpdateExecutionJob({
    ...input,
    status: 'failed',
  });
};

const mapExecutionJob = (executionJob: typeof T_DataProviderExecutions.$inferSelect): TournamentUpdateExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as TournamentUpdateExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentUpdateSummary | null) ?? null,
  };
};
