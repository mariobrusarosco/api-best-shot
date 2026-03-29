import db from '@/core/database';
import { T_DataProviderExecutions } from '@/core/database/schema';
import { eq } from 'drizzle-orm';

export type DataProviderExecutionRow = typeof T_DataProviderExecutions.$inferSelect;

export const createExecutionJob = async <TOperationType extends string>(input: {
  requestId: string;
  tournamentId: string | null;
  operationType: TOperationType;
  startedAt?: Date;
}): Promise<DataProviderExecutionRow> => {
  const [executionJob] = await db
    .insert(T_DataProviderExecutions)
    .values({
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      operationType: input.operationType,
      status: 'in_progress',
      startedAt: input.startedAt ?? new Date(),
    })
    .returning();

  return executionJob;
};

export const finalizeExecutionJob = async <TSummary>(input: {
  requestId: string;
  status: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TSummary;
}): Promise<DataProviderExecutionRow | null> => {
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

  return executionJob ?? null;
};

export const failExecutionJob = async <TSummary>(input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: TSummary;
}): Promise<DataProviderExecutionRow | null> => {
  return await finalizeExecutionJob({
    ...input,
    status: 'failed',
  });
};
