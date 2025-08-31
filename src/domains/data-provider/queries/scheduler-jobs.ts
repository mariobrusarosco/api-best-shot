import db from '@/services/database';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type {
  DB_InsertSchedulerJob,
  DB_SelectSchedulerJob,
  DB_UpdateSchedulerJob,
  SchedulerJobStatus,
  SchedulerJobType,
} from '../schema/scheduler-jobs';
import { T_SchedulerJobs } from '../schema/scheduler-jobs';

export const QUERIES_SCHEDULER_JOBS = {
  // Create a new scheduler job record
  async createSchedulerJob(job: DB_InsertSchedulerJob): Promise<DB_SelectSchedulerJob> {
    const [result] = await db.insert(T_SchedulerJobs).values(job).returning();
    return result;
  },

  // Update an existing scheduler job record
  async updateSchedulerJob(id: string, updates: DB_UpdateSchedulerJob): Promise<DB_SelectSchedulerJob | null> {
    const [result] = await db
      .update(T_SchedulerJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_SchedulerJobs.id, id))
      .returning();
    return result || null;
  },

  // Update scheduler job by schedule ID
  async updateSchedulerJobByScheduleId(
    scheduleId: string,
    updates: DB_UpdateSchedulerJob
  ): Promise<DB_SelectSchedulerJob | null> {
    const [result] = await db
      .update(T_SchedulerJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_SchedulerJobs.scheduleId, scheduleId))
      .returning();
    return result || null;
  },

  // Get scheduler job by ID
  async getSchedulerJobById(id: string): Promise<DB_SelectSchedulerJob | null> {
    const [result] = await db.select().from(T_SchedulerJobs).where(eq(T_SchedulerJobs.id, id)).limit(1);
    return result || null;
  },

  // Get scheduler job by schedule ID
  async getSchedulerJobByScheduleId(scheduleId: string): Promise<DB_SelectSchedulerJob | null> {
    const [result] = await db.select().from(T_SchedulerJobs).where(eq(T_SchedulerJobs.scheduleId, scheduleId)).limit(1);
    return result || null;
  },

  // Get all scheduler jobs for a tournament
  async getSchedulerJobsByTournament(
    tournamentId: string,
    options?: {
      scheduleType?: SchedulerJobType;
      status?: SchedulerJobStatus;
      environment?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DB_SelectSchedulerJob[]> {
    const conditions = [eq(T_SchedulerJobs.tournamentId, tournamentId)];

    if (options?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, options.scheduleType));
    }

    if (options?.status) {
      conditions.push(eq(T_SchedulerJobs.status, options.status));
    }

    if (options?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, options.environment));
    }

    const baseQuery = db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions))
      .orderBy(desc(T_SchedulerJobs.scheduledAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    }

    return await baseQuery;
  },

  // Get active scheduler jobs (pending or scheduled)
  async getActiveSchedulerJobs(options?: {
    scheduleType?: SchedulerJobType;
    environment?: string;
    limit?: number;
  }): Promise<DB_SelectSchedulerJob[]> {
    const conditions = [inArray(T_SchedulerJobs.status, ['pending', 'scheduled'])];

    if (options?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, options.scheduleType));
    }

    if (options?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, options.environment));
    }

    const baseQuery = db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions))
      .orderBy(desc(T_SchedulerJobs.scheduledAt));

    if (options?.limit) {
      return await baseQuery.limit(options.limit);
    }

    return await baseQuery;
  },

  // Get failed scheduler jobs for retry
  async getFailedSchedulerJobs(options?: {
    scheduleType?: SchedulerJobType;
    environment?: string;
    maxRetries?: number;
    limit?: number;
  }): Promise<DB_SelectSchedulerJob[]> {
    const conditions = [eq(T_SchedulerJobs.status, 'failed')];

    if (options?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, options.scheduleType));
    }

    if (options?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, options.environment));
    }

    // Only include jobs that haven't exceeded max retry attempts
    if (options?.maxRetries !== undefined) {
      conditions.push(eq(T_SchedulerJobs.retryCount, options.maxRetries));
    }

    const baseQuery = db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions))
      .orderBy(desc(T_SchedulerJobs.lastRetryAt));

    if (options?.limit) {
      return await baseQuery.limit(options.limit);
    }

    return await baseQuery;
  },

  // Get scheduler jobs by match
  async getSchedulerJobsByMatch(
    matchExternalId: string,
    matchProvider: string,
    options?: {
      status?: SchedulerJobStatus;
      environment?: string;
    }
  ): Promise<DB_SelectSchedulerJob[]> {
    const conditions = [
      eq(T_SchedulerJobs.matchExternalId, matchExternalId),
      eq(T_SchedulerJobs.matchProvider, matchProvider),
    ];

    if (options?.status) {
      conditions.push(eq(T_SchedulerJobs.status, options.status));
    }

    if (options?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, options.environment));
    }

    return await db
      .select()
      .from(T_SchedulerJobs)
      .where(and(...conditions))
      .orderBy(desc(T_SchedulerJobs.scheduledAt));
  },

  // Update scheduler job status with optional execution details
  async updateSchedulerJobStatus(
    scheduleId: string,
    status: SchedulerJobStatus,
    executionDetails?: {
      executionId?: string;
      executionStatus?: string;
      executionError?: Record<string, unknown>;
      triggeredAt?: Date;
      executedAt?: Date;
      completedAt?: Date;
    }
  ): Promise<DB_SelectSchedulerJob | null> {
    const updates: DB_UpdateSchedulerJob = {
      status,
      updatedAt: new Date(),
    };

    // Add execution details if provided
    if (executionDetails?.executionId) updates.executionId = executionDetails.executionId;
    if (executionDetails?.executionStatus) updates.executionStatus = executionDetails.executionStatus;
    if (executionDetails?.executionError) updates.executionError = executionDetails.executionError;
    if (executionDetails?.triggeredAt) updates.triggeredAt = executionDetails.triggeredAt;
    if (executionDetails?.executedAt) updates.executedAt = executionDetails.executedAt;
    if (executionDetails?.completedAt) updates.completedAt = executionDetails.completedAt;

    return await this.updateSchedulerJobByScheduleId(scheduleId, updates);
  },

  // Mark scheduler job as scheduled (when created in AWS)
  async markSchedulerJobAsScheduled(
    scheduleId: string,
    scheduleArn: string,
    scheduledAt: Date = new Date()
  ): Promise<DB_SelectSchedulerJob | null> {
    return await this.updateSchedulerJobByScheduleId(scheduleId, {
      status: 'scheduled',
      scheduleArn,
      scheduledAt,
    });
  },

  // Increment retry count
  async incrementRetryCount(scheduleId: string): Promise<DB_SelectSchedulerJob | null> {
    const job = await this.getSchedulerJobByScheduleId(scheduleId);
    if (!job) return null;

    return await this.updateSchedulerJobByScheduleId(scheduleId, {
      retryCount: job.retryCount + 1,
      lastRetryAt: new Date(),
    });
  },

  // Get all scheduler jobs with pagination and filters
  async getAllSchedulerJobs(options?: {
    status?: SchedulerJobStatus | SchedulerJobStatus[];
    scheduleType?: SchedulerJobType;
    environment?: string;
    tournamentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DB_SelectSchedulerJob[]> {
    const conditions = [];

    if (options?.status) {
      if (Array.isArray(options.status)) {
        conditions.push(inArray(T_SchedulerJobs.status, options.status));
      } else {
        conditions.push(eq(T_SchedulerJobs.status, options.status));
      }
    }

    if (options?.scheduleType) {
      conditions.push(eq(T_SchedulerJobs.scheduleType, options.scheduleType));
    }

    if (options?.environment) {
      conditions.push(eq(T_SchedulerJobs.environment, options.environment));
    }

    if (options?.tournamentId) {
      conditions.push(eq(T_SchedulerJobs.tournamentId, options.tournamentId));
    }

    const baseQuery = db.select().from(T_SchedulerJobs).orderBy(desc(T_SchedulerJobs.createdAt));

    if (conditions.length > 0) {
      baseQuery.where(and(...conditions));
    }

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    }

    return await baseQuery;
  },
};
