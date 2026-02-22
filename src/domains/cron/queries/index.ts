import db from '@/services/database';
import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import {
  DB_InsertCronJobDefinition,
  DB_InsertCronJobRun,
  DB_SelectCronJobDefinition,
  DB_SelectCronJobRun,
  DB_UpdateCronJobRun,
  T_CronJobRuns,
  DB_UpdateCronJobDefinition,
  T_CronJobDefinitions,
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

    const baseQuery =
      conditions.length > 0
        ? db
            .select()
            .from(T_CronJobDefinitions)
            .where(and(...conditions))
            .orderBy(desc(T_CronJobDefinitions.createdAt))
        : db.select().from(T_CronJobDefinitions).orderBy(desc(T_CronJobDefinitions.createdAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
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

  async pauseDefinition(
    id: string,
    reason: string,
    updatedBy: string = 'system'
  ): Promise<DB_SelectCronJobDefinition | null> {
    const [result] = await db
      .update(T_CronJobDefinitions)
      .set({
        status: 'paused',
        pauseReason: reason,
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
        pauseReason: null,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(T_CronJobDefinitions.id, id))
      .returning();

    return result || null;
  },

  async createNewVersion(
    currentDefinitionId: string,
    nextVersionDefinition: DB_InsertCronJobDefinition,
    updatedBy: string = 'system'
  ): Promise<{
    previous: DB_SelectCronJobDefinition | null;
    next: DB_SelectCronJobDefinition;
  }> {
    return await db.transaction(async tx => {
      const [previous] = await tx
        .update(T_CronJobDefinitions)
        .set({
          status: 'retired',
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(T_CronJobDefinitions.id, currentDefinitionId))
        .returning();

      const [next] = await tx
        .insert(T_CronJobDefinitions)
        .values({
          ...nextVersionDefinition,
          supersedesJobId: currentDefinitionId,
          createdBy: nextVersionDefinition.createdBy || updatedBy,
          updatedBy: nextVersionDefinition.updatedBy || updatedBy,
        })
        .returning();

      return {
        previous: previous || null,
        next,
      };
    });
  },
};

export const QUERIES_CRON = {
  definitions: QUERIES_CRON_JOB_DEFINITIONS,
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
        target: [
          T_CronJobRuns.jobDefinitionId,
          T_CronJobRuns.scheduledAt,
          T_CronJobRuns.triggerType,
        ],
      })
      .returning();

    return result || null;
  },

  async getRunById(id: string): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db.select().from(T_CronJobRuns).where(eq(T_CronJobRuns.id, id)).limit(1);
    return result || null;
  },

  async listRuns(options?: ListCronJobRunsOptions): Promise<DB_SelectCronJobRun[]> {
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

    const baseQuery =
      conditions.length > 0
        ? db
            .select()
            .from(T_CronJobRuns)
            .where(and(...conditions))
            .orderBy(desc(T_CronJobRuns.createdAt))
        : db.select().from(T_CronJobRuns).orderBy(desc(T_CronJobRuns.createdAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
  },

  async listPendingRuns(limit: number = 100): Promise<DB_SelectCronJobRun[]> {
    return await db
      .select()
      .from(T_CronJobRuns)
      .where(eq(T_CronJobRuns.status, 'pending'))
      .orderBy(asc(T_CronJobRuns.scheduledAt))
      .limit(limit);
  },

  async listDuePendingRuns(now: Date, limit: number = 100): Promise<DB_SelectCronJobRun[]> {
    return await db
      .select()
      .from(T_CronJobRuns)
      .where(and(eq(T_CronJobRuns.status, 'pending'), lt(T_CronJobRuns.scheduledAt, now)))
      .orderBy(asc(T_CronJobRuns.scheduledAt))
      .limit(limit);
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

  async markRun(
    id: string,
    updates: Partial<DB_UpdateCronJobRun>
  ): Promise<DB_SelectCronJobRun | null> {
    const [result] = await db
      .update(T_CronJobRuns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_CronJobRuns.id, id))
      .returning();

    return result || null;
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

  async findStaleRunningRuns(staleBefore: Date, limit: number = 100): Promise<DB_SelectCronJobRun[]> {
    return await db
      .select()
      .from(T_CronJobRuns)
      .where(and(eq(T_CronJobRuns.status, 'running'), lt(T_CronJobRuns.startedAt, staleBefore)))
      .orderBy(asc(T_CronJobRuns.startedAt))
      .limit(limit);
  },

  async markStaleRunningRunsAsFailed(
    staleBefore: Date,
    failure: {
      failureCode: string;
      failureMessage: string;
      failureDetails?: Record<string, unknown> | null;
    },
    limit: number = 100
  ): Promise<DB_SelectCronJobRun[]> {
    const staleIds = await db
      .select({ id: T_CronJobRuns.id })
      .from(T_CronJobRuns)
      .where(and(eq(T_CronJobRuns.status, 'running'), lt(T_CronJobRuns.startedAt, staleBefore)))
      .orderBy(asc(T_CronJobRuns.startedAt))
      .limit(limit);

    if (staleIds.length === 0) {
      return [];
    }

    const ids = staleIds.map(item => item.id);

    return await db
      .update(T_CronJobRuns)
      .set({
        status: 'failed',
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage,
        failureDetails: failure.failureDetails || null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(inArray(T_CronJobRuns.id, ids), eq(T_CronJobRuns.status, 'running')))
      .returning();
  },
};

export const QUERIES_CRON_RUNS = QUERIES_CRON_JOB_RUNS;
