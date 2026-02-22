import db from '@/services/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  DB_InsertCronJobDefinition,
  DB_SelectCronJobDefinition,
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
