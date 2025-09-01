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

interface ScheduleJobNewRequest {
  jobType: 'daily_update' | 'scores_and_standings' | 'knockout_rounds';
  environment: 'demo' | 'staging' | 'production';
  tournamentId?: string;
  roundSlug?: string;
  matchStartTime?: string;
  scheduleExpression?: string;
  description?: string;
  createdBy: string;
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
        tournamentId: request.tournamentId || null,
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
        tournamentId: request.tournamentId || null,
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
        tournamentId: request.tournamentId || null,
        jobType: request.scheduleType,
        scheduleId,
        environment,
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
          tournamentId: request.tournamentId || null,
          jobType: request.scheduleType,
          scheduleId,
          scheduleArn,
          environment,
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
          tournamentId: request.tournamentId || null,
          jobType: request.scheduleType,
          scheduleId,
          error: awsError instanceof Error ? awsError.message : 'Unknown AWS error',
          environment,
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
   * New scheduling method for all 3 job types with environment support
   */
  async scheduleJobNew(request: ScheduleJobNewRequest) {
    const startTime = Date.now();
    const jobId = uuidv4();
    const scheduleId = this.generateScheduleId(request.jobType, request.tournamentId, jobId);

    try {
      Profiling.log({
        msg: 'ADMIN SCHEDULER - Starting new job scheduling',
        data: {
          scheduleId,
          ...request,
        },
        source: 'ADMIN_SCHEDULER_scheduleJobNew',
      });

      // Get job configuration based on type and environment
      const jobConfig = this.getJobConfig(request.jobType, request.environment);

      // Generate schedule expression and timing
      const scheduleDetails = this.generateScheduleDetails(request);

      // Prepare target payload for Lambda
      const targetPayload = this.buildTargetPayload(request, scheduleId, jobConfig);

      // Create job record in database (status: pending)
      const jobData: DB_InsertDataProviderJob = {
        scheduleId,
        jobType: this.mapJobTypeToDbType(request.jobType),
        duration: scheduleDetails.duration,
        cronExpression: scheduleDetails.cronExpression,
        targetLambdaArn: jobConfig.lambdaArn,
        targetEndpoint: jobConfig.endpoint,
        targetPayload,
        tournamentId: request.jobType === 'daily_update' ? null : request.tournamentId!,
        scheduleStatus: 'pending',
        executionStatus: 'not_triggered',
        environment: request.environment,
        createdBy: request.createdBy,
        scheduledAt: new Date(),
      };

      const job = await QUERIES_DATA_PROVIDER_JOBS.createJob(jobData);

      // Send initial Slack notification (pending)
      await sendScheduleNotification({
        status: 'pending',
        tournamentId: request.tournamentId || null,
        jobType: this.mapJobTypeToDbType(request.jobType),
        scheduleId,
        environment: request.environment,
      });

      // Create schedule in AWS EventBridge
      try {
        const scheduleArn = await createAWSSchedule({
          scheduleId,
          cronExpression: scheduleDetails.cronExpression,
          startDate: scheduleDetails.startDate,
          endDate: scheduleDetails.endDate,
          lambdaArn: jobConfig.lambdaArn,
          targetPayload,
          groupName: jobConfig.groupName,
        });

        // Update job status to scheduled
        await QUERIES_DATA_PROVIDER_JOBS.updateScheduleStatus(scheduleId, 'scheduled', {
          scheduleArn,
          scheduleConfirmedAt: new Date(),
        });

        // Send success Slack notification
        await sendScheduleNotification({
          status: 'scheduled',
          tournamentId: request.tournamentId || null,
          jobType: this.mapJobTypeToDbType(request.jobType),
          scheduleId,
          scheduleArn,
          environment: request.environment,
        });

        const duration = Date.now() - startTime;
        Profiling.log({
          msg: 'ADMIN SCHEDULER - New job scheduled successfully',
          data: {
            scheduleId,
            scheduleArn,
            duration: `${duration}ms`,
          },
          source: 'ADMIN_SCHEDULER_scheduleJobNew',
        });

        return {
          success: true,
          jobId: job.id,
          scheduleId,
          scheduleArn,
          message: `${request.jobType} job scheduled successfully`,
          scheduledFor: scheduleDetails.startDate.toISOString(),
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
          tournamentId: request.tournamentId || null,
          jobType: this.mapJobTypeToDbType(request.jobType),
          scheduleId,
          error: awsError instanceof Error ? awsError.message : 'Unknown AWS error',
          environment: request.environment,
        });

        throw awsError;
      }
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SCHEDULER_scheduleJobNew',
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
      daily_update: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-daily-routine`,
        endpoint: '/api/v2/data-provider/scheduler',
        groupName: 'daily-update',
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

  /**
   * Helper methods for new job scheduling
   */
  generateScheduleId(jobType: string, tournamentId?: string, jobId?: string): string {
    const shortJobId = jobId ? jobId.split('-')[0] : uuidv4().split('-')[0];
    const shortTournamentId = tournamentId ? tournamentId.split('-')[0] : 'global';

    const typeMap = {
      daily_update: 'daily',
      scores_and_standings: 'scores',
      knockout_rounds: 'knockout',
    };

    const prefix = typeMap[jobType as keyof typeof typeMap] || jobType;
    return `${prefix}-${shortTournamentId}-${shortJobId}`;
  },

  mapJobTypeToDbType(jobType: string): JobType {
    const mapping = {
      daily_update: 'standings_and_scores', // Daily creates standings jobs
      scores_and_standings: 'standings_and_scores',
      knockout_rounds: 'new_knockout_rounds',
    };
    return mapping[jobType as keyof typeof mapping] as JobType;
  },

  getJobConfig(jobType: string, environment: string) {
    const baseUrls = {
      demo: 'https://api-best-shot-demo.mariobrusarosco.com',
      staging: 'https://api-best-shot-staging.mariobrusarosco.com',
      production: 'https://api-best-shot-production.mariobrusarosco.com',
    };

    const baseUrl = baseUrls[environment as keyof typeof baseUrls];

    const configs = {
      daily_update: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-daily-routine`,
        endpoint: `${baseUrl}/api/v2/data-provider/scheduler`,
        groupName: 'daily-update',
      },
      scores_and_standings: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-scores-and-standings`,
        endpoint: `${baseUrl}/api/v2/admin/standings`,
        groupName: 'scores-and-standings-routine',
      },
      knockout_rounds: {
        lambdaArn: `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-knockouts-update`,
        endpoint: `${baseUrl}/api/v2/admin/rounds/knockout-update`,
        groupName: 'knockouts-update',
      },
    };

    return configs[jobType as keyof typeof configs];
  },

  generateScheduleDetails(request: ScheduleJobNewRequest) {
    let cronExpression: string;
    let startDate: Date;
    let endDate: Date;
    let duration: number;

    const now = dayjs().utc();

    switch (request.jobType) {
      case 'daily_update':
        cronExpression = request.scheduleExpression || 'cron(0 6 * * ? *)'; // 6 AM UTC daily
        startDate = now.add(1, 'minute').toDate();
        duration = 365; // Run for a year
        endDate = now.add(duration, 'days').toDate();
        break;

      case 'scores_and_standings':
        if (request.matchStartTime) {
          // Schedule 2.5 hours (150 minutes) after match start
          const matchStart = dayjs(request.matchStartTime).utc();
          const scheduleTime = matchStart.add(150, 'minutes');
          startDate = scheduleTime.toDate();
          cronExpression = `cron(${scheduleTime.minute()} ${scheduleTime.hour()} ${scheduleTime.date()} ${scheduleTime.month() + 1} ? ${scheduleTime.year()})`;
        } else {
          // Default to 1 hour from now
          const scheduleTime = now.add(1, 'hour');
          startDate = scheduleTime.toDate();
          cronExpression = `cron(${scheduleTime.minute()} ${scheduleTime.hour()} ${scheduleTime.date()} ${scheduleTime.month() + 1} ? ${scheduleTime.year()})`;
        }
        duration = 1; // One-time job
        endDate = dayjs(startDate).add(1, 'day').toDate();
        break;

      case 'knockout_rounds':
        cronExpression = request.scheduleExpression || 'rate(2 days)';
        startDate = now.add(1, 'minute').toDate();
        duration = 30; // Run for 30 days
        endDate = now.add(duration, 'days').toDate();
        break;

      default:
        throw new Error(`Unknown job type: ${request.jobType}`);
    }

    return { cronExpression, startDate, endDate, duration };
  },

  buildTargetPayload(request: ScheduleJobNewRequest, scheduleId: string, jobConfig: any) {
    const basePayload = {
      scheduleId,
      jobType: request.jobType,
      targetEnv: request.environment,
      endpoint: jobConfig.endpoint,
      environment: request.environment,
      timestamp: new Date().toISOString(),
    };

    switch (request.jobType) {
      case 'daily_update':
        return basePayload;

      case 'scores_and_standings':
        return {
          ...basePayload,
          tournamentId: request.tournamentId || null,
          roundSlug: request.roundSlug,
          matchStartTime: request.matchStartTime,
        };

      case 'knockout_rounds':
        return {
          ...basePayload,
          tournamentId: request.tournamentId || null,
        };

      default:
        return basePayload;
    }
  },
};
