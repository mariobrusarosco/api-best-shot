import db from '@/core/database';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  DB_InsertCronJobDefinition,
  DB_InsertCronJobRun,
  DB_SelectCronJobDefinition,
  DB_SelectCronJobRun,
  DB_UpdateCronJobDefinition,
  T_CronJobDefinitions,
  T_CronJobRuns,
} from '../schema';

type ListCronJobDefinitionsOptions = {
  jobKey?: string;
  status?: DB_SelectCronJobDefinition['status'];
  target?: string;
  scheduleType?: DB_SelectCronJobDefinition['scheduleType'];
  limit?: number;
  offset?: number;
};

export const QUERIES_CRON_JOB_DEFINITIONS = {
  async createDefinition(definition: DB_InsertCronJobDefinition): Promise<DB_SelectCronJobDefinition> {
    const [result] = await db.insert(T_CronJobDefinitions).values(definition).returning();
    return result;
  },

  async getDefinitionById(id: string): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db.select().from(T_CronJobDefinitions).where(eq(T_CronJobDefinitions.id, id)).limit(1);
    return result || null;
  },

  async getLatestDefinitionByJobKey(jobKey: string): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db
      .select()
      .from(T_CronJobDefinitions)
      .where(eq(T_CronJobDefinitions.jobKey, jobKey))
      .orderBy(desc(T_CronJobDefinitions.version))
      .limit(1);

    return result || null;
  },

  async listDefinitions(options?: ListCronJobDefinitionsOptions): Promise<DB_SelectCronJobDefinition[]> {
    const filters = buildDefinitionFilters(options);

    const baseQuery = db
      .select()
      .from(T_CronJobDefinitions)
      .where(filters)
      .orderBy(desc(T_CronJobDefinitions.createdAt));

    if (options?.limit !== undefined && options?.offset !== undefined) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit !== undefined) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset !== undefined) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
  },

  async countDefinitions(options?: Omit<ListCronJobDefinitionsOptions, 'limit' | 'offset'>): Promise<number> {
    const filters = buildDefinitionFilters(options);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(T_CronJobDefinitions)
      .where(filters);

    return Number(result?.count || 0);
  },

  async updateDefinition(
    id: string,
    updates: Partial<DB_UpdateCronJobDefinition>
  ): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db
      .update(T_CronJobDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_CronJobDefinitions.id, id))
      .returning();

    return result || null;
  },

  async pauseDefinition(id: string, updatedBy: string = 'system'): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db
      .update(T_CronJobDefinitions)
      .set({
        status: 'paused',
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(T_CronJobDefinitions.id, id))
      .returning();

    return result || null;
  },

  async resumeDefinition(id: string, updatedBy: string = 'system'): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db
      .update(T_CronJobDefinitions)
      .set({
        status: 'active',
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(T_CronJobDefinitions.id, id))
      .returning();

    return result || null;
  },
};

type ListCronJobRunsOptions = {
  jobDefinitionId?: string;
  jobKey?: string;
  status?: DB_SelectCronJobRun['status'];
  triggerType?: DB_SelectCronJobRun['triggerType'];
  target?: string;
  limit?: number;
  offset?: number;
};

const buildRunFilters = (options?: Omit<ListCronJobRunsOptions, 'limit' | 'offset'>) => {
  const conditions = [];

  if (options?.jobDefinitionId) {
    conditions.push(eq(T_CronJobRuns.jobDefinitionId, options.jobDefinitionId));
  }

  if (options?.jobKey) {
    conditions.push(eq(T_CronJobRuns.jobKey, options.jobKey));
  }

  if (options?.status) {
    conditions.push(eq(T_CronJobRuns.status, options.status));
  }

  if (options?.triggerType) {
    conditions.push(eq(T_CronJobRuns.triggerType, options.triggerType));
  }

  if (options?.target) {
    conditions.push(eq(T_CronJobRuns.target, options.target));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

const buildDefinitionFilters = (options?: Omit<ListCronJobDefinitionsOptions, 'limit' | 'offset'>) => {
  const conditions = [];

  if (options?.jobKey) {
    conditions.push(eq(T_CronJobDefinitions.jobKey, options.jobKey));
  }

  if (options?.status) {
    conditions.push(eq(T_CronJobDefinitions.status, options.status));
  }

  if (options?.target) {
    conditions.push(eq(T_CronJobDefinitions.target, options.target));
  }

  if (options?.scheduleType) {
    conditions.push(eq(T_CronJobDefinitions.scheduleType, options.scheduleType));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

export const QUERIES_CRON_JOB_RUNS = {
  async createRun(run: DB_InsertCronJobRun): Promise<DB_SelectCronJobRun> {
    const [result] = await db.insert(T_CronJobRuns).values(run).returning();
    return result;
  },

  async createScheduledRunIfMissing(run: DB_InsertCronJobRun): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .insert(T_CronJobRuns)
      .values(run)
      .onConflictDoNothing({
        target: [T_CronJobRuns.jobDefinitionId, T_CronJobRuns.scheduledAt, T_CronJobRuns.triggerType],
      })
      .returning();

    return result || null;
  },

  async getRunById(id: string): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db.select().from(T_CronJobRuns).where(eq(T_CronJobRuns.id, id)).limit(1);
    return result || null;
  },

  async listRuns(options?: ListCronJobRunsOptions): Promise<DB_SelectCronJobRun[]> {
    const filters = buildRunFilters(options);

    const baseQuery = db.select().from(T_CronJobRuns).where(filters).orderBy(desc(T_CronJobRuns.createdAt));

    if (options?.limit !== undefined && options?.offset !== undefined) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit !== undefined) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset !== undefined) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
  },

  async countRuns(options?: Omit<ListCronJobRunsOptions, 'limit' | 'offset'>): Promise<number> {
    const filters = buildRunFilters(options);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(T_CronJobRuns)
      .where(filters);

    return Number(result?.count || 0);
  },

  async findActiveRunByDefinitionVersion(
    jobDefinitionId: string,
    jobVersion: number
  ): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .select()
      .from(T_CronJobRuns)
      .where(
        and(
          eq(T_CronJobRuns.jobDefinitionId, jobDefinitionId),
          eq(T_CronJobRuns.jobVersion, jobVersion),
          eq(T_CronJobRuns.status, 'running')
        )
      )
      .orderBy(desc(T_CronJobRuns.startedAt), desc(T_CronJobRuns.createdAt))
      .limit(1);

    return result || null;
  },

  async hasActiveRunByDefinitionVersion(jobDefinitionId: string, jobVersion: number): Promise<boolean> {
    const result = await this.findActiveRunByDefinitionVersion(jobDefinitionId, jobVersion);
    return !!result;
  },

  async markRunning(id: string, runnerInstanceId?: string): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .update(T_CronJobRuns)
      .set({
        status: 'running',
        startedAt: new Date(),
        runnerInstanceId,
        updatedAt: new Date(),
      })
      .where(and(eq(T_CronJobRuns.id, id), eq(T_CronJobRuns.status, 'pending')))
      .returning();

    return result || null;
  },

  async markSucceeded(id: string): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .update(T_CronJobRuns)
      .set({
        status: 'succeeded',
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(T_CronJobRuns.id, id), eq(T_CronJobRuns.status, 'running')))
      .returning();

    return result || null;
  },

  async markFailed(
    id: string,
    failure: {
      failureCode: string;
      failureMessage: string;
      failureDetails?: Record<string, unknown> | null;
    }
  ): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .update(T_CronJobRuns)
      .set({
        status: 'failed',
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage,
        failureDetails: failure.failureDetails || null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(T_CronJobRuns.id, id), eq(T_CronJobRuns.status, 'running')))
      .returning();

    return result || null;
  },

  async markPendingRunsAsSkipped(failure: {
    failureCode: string;
    failureMessage: string;
    failureDetails?: Record<string, unknown> | null;
  }): Promise<DB_SelectCronJobRun[]> {
    const now = new Date();

    return await db
      .update(T_CronJobRuns)
      .set({
        status: 'skipped',
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage,
        failureDetails: failure.failureDetails || null,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(T_CronJobRuns.status, 'pending'))
      .returning();
  },

  async markRunningRunsAsSkipped(failure: {
    failureCode: string;
    failureMessage: string;
    failureDetails?: Record<string, unknown> | null;
  }): Promise<DB_SelectCronJobRun[]> {
    const now = new Date();

    return await db
      .update(T_CronJobRuns)
      .set({
        status: 'skipped',
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage,
        failureDetails: failure.failureDetails || null,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(T_CronJobRuns.status, 'running'))
      .returning();
  },
};
