import {
  DB_InsertDataProviderJob,
  ExecutionStatus,
  JobType,
  ScheduleStatus,
  T_DataProviderJobs,
} from '@/domains/data-provider/schema/data-provider-jobs';
import db from '@/services/database';
import { and, asc, desc, eq } from 'drizzle-orm';

export const QUERIES_DATA_PROVIDER_JOBS = {
  // Create a new job
  async createJob(data: DB_InsertDataProviderJob) {
    const [job] = await db.insert(T_DataProviderJobs).values(data).returning();
    return job;
  },

  // Get job by ID
  async getJobById(id: string) {
    const [job] = await db.select().from(T_DataProviderJobs).where(eq(T_DataProviderJobs.id, id));
    return job || null;
  },

  // Get job by schedule ID
  async getJobByScheduleId(scheduleId: string) {
    const [job] = await db.select().from(T_DataProviderJobs).where(eq(T_DataProviderJobs.scheduleId, scheduleId));
    return job || null;
  },

  // Update schedule status
  async updateScheduleStatus(
    scheduleId: string,
    status: ScheduleStatus,
    updates: {
      scheduleArn?: string;
      scheduleConfirmedAt?: Date;
      scheduleFailedAt?: Date;
      scheduleErrorDetails?: Record<string, unknown>;
    }
  ) {
    const [updated] = await db
      .update(T_DataProviderJobs)
      .set({
        scheduleStatus: status,
        ...updates,
      })
      .where(eq(T_DataProviderJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Update execution status
  async updateExecutionStatus(
    scheduleId: string,
    status: ExecutionStatus,
    updates: {
      triggeredAt?: Date;
      executedAt?: Date;
      completedAt?: Date;
      executionId?: string;
      executionResult?: Record<string, unknown>;
      executionErrorDetails?: Record<string, unknown>;
    }
  ) {
    const [updated] = await db
      .update(T_DataProviderJobs)
      .set({
        executionStatus: status,
        ...updates,
      })
      .where(eq(T_DataProviderJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Mark job as scheduled
  async markJobAsScheduled(scheduleId: string, scheduleArn: string, scheduledAt: Date) {
    const [updated] = await db
      .update(T_DataProviderJobs)
      .set({
        scheduleStatus: 'scheduled',
        scheduleArn,
        scheduledAt,
      })
      .where(eq(T_DataProviderJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Update job status (combined method for both schedule and execution status)
  async updateJobStatus(
    scheduleId: string,
    status: ScheduleStatus | ExecutionStatus,
    updates: {
      scheduleArn?: string;
      scheduleConfirmedAt?: Date;
      scheduleFailedAt?: Date;
      scheduleErrorDetails?: Record<string, unknown>;
      triggeredAt?: Date;
      executedAt?: Date;
      completedAt?: Date;
      executionId?: string;
      executionResult?: Record<string, unknown>;
      executionErrorDetails?: Record<string, unknown>;
    }
  ) {
    const [updated] = await db
      .update(T_DataProviderJobs)
      .set({
        ...updates,
      })
      .where(eq(T_DataProviderJobs.scheduleId, scheduleId))
      .returning();
    return updated || null;
  },

  // Increment retry count
  async incrementRetryCount(_scheduleId: string) {
    // Note: This table doesn't have a retry count field, so this is a placeholder
    // You might want to add a retry count field to the schema if needed
    return null;
  },

  // Get all jobs with optional filters
  async getAllJobs(filters?: {
    tournamentId?: string;
    jobType?: JobType;
    scheduleStatus?: ScheduleStatus;
    executionStatus?: ExecutionStatus;
    environment?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(T_DataProviderJobs);

    const conditions = [];
    if (filters?.tournamentId) {
      conditions.push(eq(T_DataProviderJobs.tournamentId, filters.tournamentId));
    }
    if (filters?.jobType) {
      conditions.push(eq(T_DataProviderJobs.jobType, filters.jobType));
    }
    if (filters?.scheduleStatus) {
      conditions.push(eq(T_DataProviderJobs.scheduleStatus, filters.scheduleStatus));
    }
    if (filters?.executionStatus) {
      conditions.push(eq(T_DataProviderJobs.executionStatus, filters.executionStatus));
    }
    if (filters?.environment) {
      conditions.push(eq(T_DataProviderJobs.environment, filters.environment));
    }

    if (conditions.length > 0) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.where(and(...conditions));
    }

    // @ts-expect-error - Drizzle ORM type issue
    query = query.orderBy(desc(T_DataProviderJobs.createdAt));

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

  // Get jobs by tournament ID
  async getJobsByTournamentId(tournamentId: string) {
    return await db
      .select()
      .from(T_DataProviderJobs)
      .where(eq(T_DataProviderJobs.tournamentId, tournamentId))
      .orderBy(desc(T_DataProviderJobs.createdAt));
  },

  // Get active jobs (scheduled but not completed)
  async getActiveJobs() {
    return await db
      .select()
      .from(T_DataProviderJobs)
      .where(
        and(eq(T_DataProviderJobs.scheduleStatus, 'scheduled'), eq(T_DataProviderJobs.executionStatus, 'not_triggered'))
      )
      .orderBy(asc(T_DataProviderJobs.scheduledAt));
  },

  // Get failed jobs
  async getFailedJobs(filters?: { limit?: number }) {
    let query = db
      .select()
      .from(T_DataProviderJobs)
      .where(
        and(
          eq(T_DataProviderJobs.scheduleStatus, 'schedule_failed'),
          eq(T_DataProviderJobs.executionStatus, 'execution_failed')
        )
      )
      .orderBy(desc(T_DataProviderJobs.createdAt));

    if (filters?.limit) {
      // @ts-expect-error - Drizzle ORM type issue
      query = query.limit(filters.limit);
    }

    return await query;
  },

  // Get job statistics
  async getJobStats(filters?: { tournamentId?: string; environment?: string }) {
    const jobs = await this.getAllJobs(filters);

    const stats = {
      total: jobs.length,
      byScheduleStatus: {
        pending: 0,
        scheduled: 0,
        schedule_failed: 0,
      },
      byExecutionStatus: {
        not_triggered: 0,
        triggered: 0,
        executing: 0,
        execution_succeeded: 0,
        execution_failed: 0,
      },
      byJobType: {
        standings_and_scores: 0,
        new_knockout_rounds: 0,
        daily_update: 0,
      },
    };

    jobs.forEach(job => {
      stats.byScheduleStatus[job.scheduleStatus]++;
      stats.byExecutionStatus[job.executionStatus]++;
      stats.byJobType[job.jobType]++;
    });

    return stats;
  },

  // Check for duplicate schedules
  async checkForDuplicateSchedule(tournamentId: string, jobType: JobType): Promise<boolean> {
    const existingJobs = await db
      .select()
      .from(T_DataProviderJobs)
      .where(
        and(
          eq(T_DataProviderJobs.tournamentId, tournamentId),
          eq(T_DataProviderJobs.jobType, jobType),
          eq(T_DataProviderJobs.scheduleStatus, 'scheduled'),
          eq(T_DataProviderJobs.executionStatus, 'not_triggered')
        )
      );
    return existingJobs.length > 0;
  },
};
