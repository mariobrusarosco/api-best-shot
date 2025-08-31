import Profiling from '@/services/profiling';
import type { DB_InsertSchedulerJob, SchedulerJobStatus, SchedulerJobType } from '../schema/scheduler-jobs';
import { QUERIES_SCHEDULER_JOBS } from '../queries/scheduler-jobs';

export const SchedulerService = {
  // Track schedule creation in database when AWS schedule is created
  async trackScheduleCreation(config: {
    scheduleId: string;
    scheduleType: SchedulerJobType;
    cronExpression?: string;
    targetLambdaArn: string;
    targetInput: Record<string, unknown>;
    tournamentId: string;
    matchId?: string;
    matchExternalId?: string;
    matchProvider?: string;
    roundSlug?: string;
    environment: string;
    createdBy?: string;
  }): Promise<string> {
    try {
      const jobData: DB_InsertSchedulerJob = {
        scheduleId: config.scheduleId,
        scheduleType: config.scheduleType,
        cronExpression: config.cronExpression,
        targetLambdaArn: config.targetLambdaArn,
        targetInput: config.targetInput,
        tournamentId: config.tournamentId,
        matchId: config.matchId,
        matchExternalId: config.matchExternalId,
        matchProvider: config.matchProvider,
        roundSlug: config.roundSlug,
        environment: config.environment,
        createdBy: config.createdBy || 'system',
        status: 'pending',
      };

      const schedulerJob = await QUERIES_SCHEDULER_JOBS.createSchedulerJob(jobData);

      Profiling.log({
        msg: 'SCHEDULER JOB TRACKED',
        data: {
          jobId: schedulerJob.id,
          scheduleId: config.scheduleId,
          scheduleType: config.scheduleType,
          tournamentId: config.tournamentId,
        },
        source: 'SCHEDULER_SERVICE_trackScheduleCreation',
      });

      return schedulerJob.id;
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleCreation',
        error,
        data: { scheduleId: config.scheduleId },
      });
      throw error;
    }
  },

  // Mark schedule as successfully created in AWS
  async markScheduleAsScheduled(
    scheduleId: string,
    scheduleArn: string,
    scheduledAt: Date = new Date()
  ): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.markSchedulerJobAsScheduled(scheduleId, scheduleArn, scheduledAt);

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      Profiling.log({
        msg: 'SCHEDULER JOB MARKED AS SCHEDULED',
        data: {
          jobId: updatedJob.id,
          scheduleId,
          scheduleArn,
        },
        source: 'SCHEDULER_SERVICE_markScheduleAsScheduled',
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_markScheduleAsScheduled',
        error,
        data: { scheduleId },
      });
      throw error;
    }
  },

  // Track when EventBridge triggers the schedule
  async trackScheduleExecution(scheduleId: string, executionId: string, triggeredAt: Date = new Date()): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(scheduleId, 'triggered', {
        executionId,
        triggeredAt,
      });

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      Profiling.log({
        msg: 'SCHEDULER JOB EXECUTION TRACKED',
        data: {
          jobId: updatedJob.id,
          scheduleId,
          executionId,
        },
        source: 'SCHEDULER_SERVICE_trackScheduleExecution',
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleExecution',
        error,
        data: { scheduleId, executionId },
      });
      throw error;
    }
  },

  // Track when Lambda starts executing
  async trackScheduleExecutionStart(scheduleId: string, executedAt: Date = new Date()): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(scheduleId, 'executing', {
        executedAt,
      });

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      Profiling.log({
        msg: 'SCHEDULER JOB EXECUTION STARTED',
        data: {
          jobId: updatedJob.id,
          scheduleId,
        },
        source: 'SCHEDULER_SERVICE_trackScheduleExecutionStart',
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleExecutionStart',
        error,
        data: { scheduleId },
      });
      throw error;
    }
  },

  // Track successful completion
  async trackScheduleCompletion(
    scheduleId: string,
    executionStatus: string,
    completedAt: Date = new Date()
  ): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(scheduleId, 'completed', {
        executionStatus,
        completedAt,
      });

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      Profiling.log({
        msg: 'SCHEDULER JOB COMPLETED',
        data: {
          jobId: updatedJob.id,
          scheduleId,
          executionStatus,
        },
        source: 'SCHEDULER_SERVICE_trackScheduleCompletion',
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleCompletion',
        error,
        data: { scheduleId, executionStatus },
      });
      throw error;
    }
  },

  // Track failure with error details
  async trackScheduleFailure(
    scheduleId: string,
    executionError: Record<string, unknown>,
    executionStatus?: string,
    completedAt: Date = new Date()
  ): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(scheduleId, 'failed', {
        executionError,
        executionStatus,
        completedAt,
      });

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      // Increment retry count for failed jobs
      await QUERIES_SCHEDULER_JOBS.incrementRetryCount(scheduleId);

      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleFailure',
        error: executionError,
        data: {
          jobId: updatedJob.id,
          scheduleId,
          executionStatus,
          retryCount: updatedJob.retryCount + 1,
        },
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_trackScheduleFailure',
        error,
        data: { scheduleId },
      });
      throw error;
    }
  },

  // Cancel a scheduled job
  async cancelSchedule(scheduleId: string, reason: string): Promise<void> {
    try {
      const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(scheduleId, 'cancelled', {
        executionError: { reason, cancelledAt: new Date().toISOString() },
      });

      if (!updatedJob) {
        throw new Error(`Scheduler job not found for scheduleId: ${scheduleId}`);
      }

      Profiling.log({
        msg: 'SCHEDULER JOB CANCELLED',
        data: {
          jobId: updatedJob.id,
          scheduleId,
          reason,
        },
        source: 'SCHEDULER_SERVICE_cancelSchedule',
      });
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_cancelSchedule',
        error,
        data: { scheduleId, reason },
      });
      throw error;
    }
  },

  // Get scheduler job statistics
  async getSchedulerStats(options?: { tournamentId?: string; environment?: string; scheduleType?: SchedulerJobType }) {
    try {
      const jobs = await QUERIES_SCHEDULER_JOBS.getAllSchedulerJobs({
        tournamentId: options?.tournamentId,
        environment: options?.environment,
        scheduleType: options?.scheduleType,
      });

      const stats = jobs.reduce(
        (acc, job) => {
          acc.total += 1;
          acc.byStatus[job.status] = (acc.byStatus[job.status] || 0) + 1;
          acc.byType[job.scheduleType] = (acc.byType[job.scheduleType] || 0) + 1;
          return acc;
        },
        {
          total: 0,
          byStatus: {} as Record<SchedulerJobStatus, number>,
          byType: {} as Record<SchedulerJobType, number>,
        }
      );

      return stats;
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_getSchedulerStats',
        error,
        data: options,
      });
      throw error;
    }
  },

  // Check for duplicate schedules to prevent conflicts
  async checkForDuplicateSchedule(scheduleId: string): Promise<boolean> {
    try {
      const existingJob = await QUERIES_SCHEDULER_JOBS.getSchedulerJobByScheduleId(scheduleId);
      return existingJob !== null;
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_checkForDuplicateSchedule',
        error,
        data: { scheduleId },
      });
      throw error;
    }
  },

  // Get failed jobs that can be retried
  async getRetryableJobs(maxRetries: number = 3): Promise<
    Array<{
      id: string;
      scheduleId: string;
      scheduleType: SchedulerJobType;
      retryCount: number;
      lastRetryAt: Date | null;
      executionError: Record<string, unknown> | null;
    }>
  > {
    try {
      const failedJobs = await QUERIES_SCHEDULER_JOBS.getFailedSchedulerJobs({
        maxRetries: maxRetries - 1, // Get jobs that haven't exceeded max retries
      });

      return failedJobs.map(job => ({
        id: job.id,
        scheduleId: job.scheduleId,
        scheduleType: job.scheduleType,
        retryCount: job.retryCount,
        lastRetryAt: job.lastRetryAt,
        executionError: job.executionError as Record<string, unknown> | null,
      }));
    } catch (error) {
      Profiling.error({
        source: 'SCHEDULER_SERVICE_getRetryableJobs',
        error,
        data: { maxRetries },
      });
      throw error;
    }
  },
};
