import db from '@/core/database';
import { T_DataProviderExecutions } from '@/core/database/schema';
import type { TournamentOpenMatchSyncSummary } from '@/domains/data-provider-v2/contracts/open-match-sync';
import { eq } from 'drizzle-orm';

export const OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE = 'matches_sync_open_v2' as const;

export type OpenMatchSyncExecutionJobStatus = 'in_progress' | 'completed' | 'partial_failure' | 'failed';

export type OpenMatchSyncExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string | null;
  operationType: typeof OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE;
  status: OpenMatchSyncExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentOpenMatchSyncSummary | null;
};

export const createOpenMatchSyncExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<OpenMatchSyncExecutionJob> => {
  const [executionJob] = await db
    .insert(T_DataProviderExecutions)
    .values({
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      operationType: OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE,
      status: 'in_progress',
      startedAt: input.startedAt ?? new Date(),
    })
    .returning();

  return mapExecutionJob(executionJob);
};

export const completeOpenMatchSyncExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentOpenMatchSyncSummary;
}): Promise<OpenMatchSyncExecutionJob | null> => {
  const [executionJob] = await db
    .update(T_DataProviderExecutions)
    .set({
      status: 'completed',
      completedAt: input.completedAt ?? new Date(),
      duration: input.duration,
      reportFileUrl: input.reportFileUrl,
      reportFileKey: input.reportFileKey,
      summary: input.summary,
      updatedAt: new Date(),
    })
    .where(eq(T_DataProviderExecutions.requestId, input.requestId))
    .returning();

  return executionJob ? mapExecutionJob(executionJob) : null;
};

export const failOpenMatchSyncExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentOpenMatchSyncSummary;
}): Promise<OpenMatchSyncExecutionJob | null> => {
  return updateOpenMatchSyncExecutionJobStatus({
    ...input,
    status: 'failed',
  });
};

export const partialFailOpenMatchSyncExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentOpenMatchSyncSummary;
}): Promise<OpenMatchSyncExecutionJob | null> => {
  return updateOpenMatchSyncExecutionJobStatus({
    ...input,
    status: 'partial_failure',
  });
};

const updateOpenMatchSyncExecutionJobStatus = async (input: {
  requestId: string;
  status: Exclude<OpenMatchSyncExecutionJobStatus, 'in_progress'>;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TournamentOpenMatchSyncSummary;
}): Promise<OpenMatchSyncExecutionJob | null> => {
  const [executionJob] = await db
    .update(T_DataProviderExecutions)
    .set({
      status: input.status,
      completedAt: input.completedAt ?? new Date(),
      duration: input.duration,
      reportFileUrl: input.reportFileUrl,
      reportFileKey: input.reportFileKey,
      summary: input.summary,
      updatedAt: new Date(),
    })
    .where(eq(T_DataProviderExecutions.requestId, input.requestId))
    .returning();

  return executionJob ? mapExecutionJob(executionJob) : null;
};

export const getOpenMatchSyncExecutionJobByRequestId = async (
  requestId: string
): Promise<OpenMatchSyncExecutionJob | null> => {
  const [executionJob] = await db
    .select()
    .from(T_DataProviderExecutions)
    .where(eq(T_DataProviderExecutions.requestId, requestId))
    .limit(1);

  return executionJob ? mapExecutionJob(executionJob) : null;
};

const mapExecutionJob = (executionJob: typeof T_DataProviderExecutions.$inferSelect): OpenMatchSyncExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as OpenMatchSyncExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentOpenMatchSyncSummary | null) ?? null,
  };
};
