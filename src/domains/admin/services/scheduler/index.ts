import Profiling from '@/services/profiling';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { QUERIES_DATA_PROVIDER_JOBS } from '@/domains/data-provider/queries/data-provider-jobs';
import type { JobType, DB_InsertDataProviderJob } from '@/domains/data-provider/schema/data-provider-jobs';
import { env } from '@/config/env';
import { createAWSSchedule } from '@/domains/admin/services/scheduler/aws-scheduler';
import { sendScheduleNotification } from '@/domains/admin/services/scheduler/notifications';

dayjs.extend(utc);

interface ScheduleJobRequest {
  tournamentId: string;
  scheduleType: JobType;
  duration: number; // in days
  createdBy: string; // admin user
}

export const AdminSchedulerService = {
  /**
   * Main entry point for scheduling a job
   */
  async scheduleJob(request: ScheduleJobRequest) {
    const startTime = Date.now();
    // AWS Schedule names must be ≤ 64 chars. Use shorter format with first 8 chars of UUIDs
    const shortTournamentId = request.tournamentId.split('-')[0]; // First 8 chars
    const shortJobId = uuidv4().split('-')[0]; // First 8 chars
    const typePrefix = request.scheduleType === 'standings_and_scores' ? 'standings' : 'knockouts';
    const scheduleId = `${typePrefix}-${shortTournamentId}-${shortJobId}`;
    const environment = env.NODE_ENV || 'development';

    try {
      Profiling.log({
        msg: 'ADMIN SCHEDULER - Starting job scheduling',
        data: {
          scheduleId,
          ...request,
        },
        source: 'ADMIN_SCHEDULER_scheduleJob',
      });

      // Check for duplicate active schedules
      const isDuplicate = await QUERIES_DATA_PROVIDER_JOBS.checkForDuplicateSchedule(
        request.tournamentId,
        request.scheduleType
      );

      if (isDuplicate) {
        throw new Error(
          `Active schedule already exists for tournament ${request.tournamentId} with type ${request.scheduleType}`
        );
      }

      // Generate cron expression (daily at noon UTC)
      const cronExpression = 'cron(0 12 * * ? *)';

      // Calculate end date based on duration
      const startDate = dayjs().utc().add(1, 'minute').toDate();
      const endDate = dayjs().utc().add(request.duration, 'days').toDate();

      // Determine Lambda ARN and endpoint based on job type
      const lambdaConfig = this.getLambdaConfig(request.scheduleType);

      // Prepare target payload for Lambda
      const targetPayload = {
        scheduleId,
        tournamentId: request.tournamentId,
        jobType: request.scheduleType,
        targetEndpoint: lambdaConfig.endpoint,
        environment,
        timestamp: new Date().toISOString(),
      };

      // Create job record in database (status: pending)
      const jobData: DB_InsertDataProviderJob = {
        scheduleId,
        jobType: request.scheduleType,
        duration: request.duration,
        cronExpression,
        targetLambdaArn: lambdaConfig.lambdaArn,
        targetEndpoint: lambdaConfig.endpoint,
        targetPayload,
        tournamentId: request.tournamentId,
        scheduleStatus: 'pending',
        executionStatus: 'not_triggered',
        environment,
        createdBy: request.createdBy,
        scheduledAt: new Date(),
      };

      const job = await QUERIES_DATA_PROVIDER_JOBS.createJob(jobData);

      // Send initial Slack notification (pending)
      await sendScheduleNotification({
        status: 'pending',
        tournamentId: request.tournamentId,
        jobType: request.scheduleType,
        scheduleId,
      });

      // Create schedule in AWS EventBridge
      try {
        const scheduleArn = await createAWSSchedule({
          scheduleId,
          cronExpression,
          startDate,
          endDate,
          lambdaArn: lambdaConfig.lambdaArn,
          targetPayload,
          groupName: lambdaConfig.groupName,
        });

        // Update job status to scheduled
        await QUERIES_DATA_PROVIDER_JOBS.updateScheduleStatus(scheduleId, 'scheduled', {
          scheduleArn,
          scheduleConfirmedAt: new Date(),
        });

        // Send success Slack notification
        await sendScheduleNotification({
          status: 'scheduled',
          tournamentId: request.tournamentId,
          jobType: request.scheduleType,
          scheduleId,
          scheduleArn,
        });

        const duration = Date.now() - startTime;
        Profiling.log({
          msg: 'ADMIN SCHEDULER - Job scheduled successfully',
          data: {
            scheduleId,
            scheduleArn,
            duration: `${duration}ms`,
          },
          source: 'ADMIN_SCHEDULER_scheduleJob',
        });

        return {
          success: true,
          jobId: job.id,
          scheduleId,
          scheduleArn,
          message: `Job scheduled successfully for tournament ${request.tournamentId}`,
        };
      } catch (awsError) {
        // Update job status to schedule_failed
        await QUERIES_DATA_PROVIDER_JOBS.updateScheduleStatus(scheduleId, 'schedule_failed', {
          scheduleFailedAt: new Date(),
          scheduleErrorDetails: {
            error: awsError instanceof Error ? awsError.message : 'Unknown AWS error',
            stack: awsError instanceof Error ? awsError.stack : undefined,
          },
        });

        // Send failure Slack notification
        await sendScheduleNotification({
          status: 'schedule_failed',
          tournamentId: request.tournamentId,
          jobType: request.scheduleType,
          scheduleId,
          error: awsError instanceof Error ? awsError.message : 'Unknown AWS error',
        });

        throw awsError;
      }
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_scheduleJob',
        error,
        data: { scheduleId, ...request },
      });
      throw error;
    }
  },

  /**
   * Get Lambda configuration based on job type
   */
  getLambdaConfig(jobType: JobType) {
    const configs = {
      standings_and_scores: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-scores-and-standings`,
        endpoint: '/api/v2/admin/standings',
        groupName: 'scores-and-standings-routine',
      },
      new_knockout_rounds: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-knockouts-update`,
        endpoint: '/api/v2/admin/rounds/knockout-update',
        groupName: 'knockouts-update',
      },
    };

    return configs[jobType];
  },

  /**
   * Get all scheduled jobs
   */
  async getScheduledJobs(filters?: {
    tournamentId?: string;
    jobType?: JobType;
    environment?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      return await QUERIES_DATA_PROVIDER_JOBS.getAllJobs(filters);
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_getScheduledJobs',
        error,
        data: filters,
      });
      throw error;
    }
  },

  /**
   * Get job by ID
   */
  async getJobById(jobId: string) {
    try {
      return await QUERIES_DATA_PROVIDER_JOBS.getJobById(jobId);
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_getJobById',
        error,
        data: { jobId },
      });
      throw error;
    }
  },

  /**
   * Get jobs by tournament
   */
  async getJobsByTournament(tournamentId: string) {
    try {
      return await QUERIES_DATA_PROVIDER_JOBS.getJobsByTournamentId(tournamentId);
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_getJobsByTournament',
        error,
        data: { tournamentId },
      });
      throw error;
    }
  },

  /**
   * Get job statistics
   */
  async getJobStats(filters?: { tournamentId?: string; environment?: string }) {
    try {
      return await QUERIES_DATA_PROVIDER_JOBS.getJobStats(filters);
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_getJobStats',
        error,
        data: filters,
      });
      throw error;
    }
  },
};
