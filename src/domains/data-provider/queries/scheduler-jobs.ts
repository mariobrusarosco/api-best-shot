import {
  DB_InsertSchedulerJob,
  SchedulerJobStatus,
  SchedulerJobType,
  T_SchedulerJobs,
} from '@/domains/data-provider/schema/scheduler-jobs';
import db from '@/services/database';
import { and, desc, eq, or, sql } from 'drizzle-orm';

export const QUERIES_SCHEDULER_JOBS = {
  // Create a new scheduler job
  async createSchedulerJob(data: DB_InsertSchedulerJob) {
    const [job] = await db.insert(T_SchedulerJobs).values(data).returning();
    return job;
  },

  // Get scheduler job by ID
  async getSchedulerJobById(id: string) {
    const [job] = await db.select().from(T_SchedulerJobs).where(eq(T_SchedulerJobs.id, id));
    return job || null;
  },

  // Get scheduler job by schedule ID
  async getSchedulerJobByScheduleId(scheduleId: string) {
    const [job] = await db.select().from(T_SchedulerJobs).where(eq(T_SchedulerJobs.scheduleId, scheduleId));
    return job || null;
  },

  // Mark scheduler job as scheduled in AWS
  async markSchedulerJobAsScheduled(scheduleId: string, scheduleArn: string, scheduledAt: Date) {
    const [updated] = await db
      .update(T_SchedulerJobs)
      .set({
        status: 'scheduled',
        scheduleArn,
        scheduledAt,
      })
      .where(eq(T_SchedulerJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Update scheduler job status
  async updateSchedulerJobStatus(
    scheduleId: string,
    status: SchedulerJobStatus,
    updates?: {
      executionId?: string;
      triggeredAt?: Date;
      executedAt?: Date;
      completedAt?: Date;
      executionStatus?: string;
      executionError?: Record<string, unknown>;
    }
  ) {
    const [updated] = await db
      .update(T_SchedulerJobs)
      .set({
        status,
        ...updates,
      })
      .where(eq(T_SchedulerJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Increment retry count
  async incrementRetryCount(scheduleId: string) {
    await db
      .update(T_SchedulerJobs)
      .set({
        retryCount: sql`${T_SchedulerJobs.retryCount} + 1`,
      })
      .where(eq(T_SchedulerJobs.scheduleId, scheduleId));
  },

  // Get all scheduler jobs
  async getAllSchedulerJobs(filters?: {
    tournamentId?: string;
    environment?: string;
    scheduleType?: SchedulerJobType;
    status?: SchedulerJobStatus | SchedulerJobStatus[];
    limit?: number;
    offset?: number;
  }) {
    const conditions = [];
    if (filters?.tournamentId) {
      conditions.push(eq(T_SchedulerJobs.tournamentId, filters.tournamentId));
    }
    if (filters?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, filters.environment));
    }
    if (filters?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, filters.scheduleType));
    }
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(or(...filters.status.map(s => eq(T_SchedulerJobs.status, s))));
      } else {
        conditions.push(eq(T_SchedulerJobs.status, filters.status));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let query = db.select().from(T_SchedulerJobs);
    if (whereClause) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.where(whereClause);
    }
    // @ts-expect-error - Drizzle ORM type issue
    query = query.orderBy(desc(T_SchedulerJobs.createdAt));

    if (filters?.limit) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.offset(filters.offset);
    }

    return await query;
  },

  // Get scheduler jobs by tournament
  async getSchedulerJobsByTournament(
    tournamentId: string,
    filters?: {
      scheduleType?: SchedulerJobType;
      status?: SchedulerJobStatus;
      environment?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const conditions = [eq(T_SchedulerJobs.tournamentId, tournamentId)];

    if (filters?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, filters.scheduleType));
    }
    if (filters?.status) {
      conditions.push(eq(T_SchedulerJobs.status, filters.status));
    }
    if (filters?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, filters.environment));
    }

    let query = db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions));
    // @ts-expect-error - Drizzle ORM type issue
    query = query.orderBy(desc(T_SchedulerJobs.createdAt));

    if (filters?.limit) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.offset(filters.offset);
    }

    return await query;
  },

  // Get failed scheduler jobs
  async getFailedSchedulerJobs(filters?: { maxRetries?: number }) {
    const conditions = [eq(T_SchedulerJobs.status, 'failed')];

    if (filters?.maxRetries !== undefined) {
      conditions.push(eq(T_SchedulerJobs.retryCount, filters.maxRetries));
    }

    return await db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions))
      .orderBy(desc(T_SchedulerJobs.createdAt));
  },

  // Get active scheduler jobs (triggered, executing, or scheduled)
  async getActiveSchedulerJobs() {
    return await db
      .select()
      .from(T_SchedulerJobs)
      .where(
        or(
          eq(T_SchedulerJobs.status, 'triggered'),
          eq(T_SchedulerJobs.status, 'executing'),
          eq(T_SchedulerJobs.status, 'scheduled')
        )
      )
      .orderBy(desc(T_SchedulerJobs.createdAt));
  },
};
