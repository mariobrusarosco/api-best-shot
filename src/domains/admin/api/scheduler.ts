import { Request, Response } from 'express';
import { AdminSchedulerService } from '@/domains/admin/services/scheduler';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import type { JobType } from '@/domains/data-provider/schema/data-provider-jobs';

interface ScheduleJobRequest {
  jobType: 'daily_update' | 'scores_and_standings' | 'knockout_rounds';
  environment: 'demo' | 'staging' | 'production';
  tournamentId?: string; // Optional for daily_update jobs
  roundSlug?: string; // Only for scores_and_standings
  matchStartTime?: string; // Only for scores_and_standings
  scheduleExpression?: string; // Optional - defaults based on job type
  description?: string;
}

/**
 * Schedule a new job
 * POST /api/v2/admin/schedule
 */
const scheduleJob = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const body = req.body as ScheduleJobRequest;

    // Validate required fields
    if (!body.jobType || !body.environment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobType, environment',
      });
    }

    // Validate jobType
    if (!['daily_update', 'scores_and_standings', 'knockout_rounds'].includes(body.jobType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid jobType. Must be "daily_update", "scores_and_standings", or "knockout_rounds"',
      });
    }

    // Validate environment
    if (!['demo', 'staging', 'production'].includes(body.environment)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid environment. Must be "demo", "staging", or "production"',
      });
    }

    // Job-specific validation
    if (body.jobType === 'scores_and_standings') {
      if (!body.tournamentId || !body.matchStartTime) {
        return res.status(400).json({
          success: false,
          error: 'scores_and_standings jobs require tournamentId and matchStartTime',
        });
      }
    }

    if (body.jobType === 'knockout_rounds') {
      if (!body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'knockout_rounds jobs require tournamentId',
        });
      }
    }

    // TODO: Extract actual admin user from auth token
    const adminUser = 'admin'; // Placeholder - should come from auth

    const result = await AdminSchedulerService.scheduleJobNew({
      jobType: body.jobType,
      environment: body.environment,
      tournamentId: body.tournamentId,
      roundSlug: body.roundSlug,
      matchStartTime: body.matchStartTime,
      scheduleExpression: body.scheduleExpression,
      description: body.description,
      createdBy: adminUser,
    });

    const duration = Date.now() - startTime;

    Profiling.log({
      msg: 'ADMIN API - Job scheduled successfully',
      data: {
        ...result,
        duration: `${duration}ms`,
      },
      source: 'ADMIN_API_scheduleJob',
    });

    return res.status(200).json({
      ...result,
      duration: `${duration}ms`,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'ADMIN_API_scheduleJob',
      error,
      data: req.body,
    });

    // Check for specific error types
    if (error instanceof Error && error.message.includes('Active schedule already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    handleInternalServerErrorResponse(res, error);
  }
};

/**
 * Get all scheduled jobs
 * GET /api/v2/admin/scheduler/jobs
 */
const getScheduledJobs = async (req: Request, res: Response) => {
  try {
    const filters = {
      tournamentId: req.query.tournament_id as string,
      jobType: req.query.job_type as JobType,
      environment: req.query.environment as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const jobs = await AdminSchedulerService.getScheduledJobs(filters);

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'ADMIN_API_getScheduledJobs',
      error,
      data: req.query,
    });
    handleInternalServerErrorResponse(res, error);
  }
};

/**
 * Get job by ID
 * GET /api/v2/admin/scheduler/jobs/:id
 */
const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    const job = await AdminSchedulerService.getJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'ADMIN_API_getJobById',
      error,
      data: { id: req.params.id },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

/**
 * Get jobs by tournament
 * GET /api/v2/admin/scheduler/jobs/tournament/:tournamentId
 */
const getJobsByTournament = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required',
      });
    }

    const jobs = await AdminSchedulerService.getJobsByTournament(tournamentId);

    return res.status(200).json({
      success: true,
      tournamentId,
      count: jobs.length,
      jobs,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'ADMIN_API_getJobsByTournament',
      error,
      data: { tournamentId: req.params.tournamentId },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

/**
 * Get job statistics
 * GET /api/v2/admin/scheduler/jobs/stats
 */
const getJobStats = async (req: Request, res: Response) => {
  try {
    const filters = {
      tournamentId: req.query.tournament_id as string,
      environment: req.query.environment as string,
    };

    const stats = await AdminSchedulerService.getJobStats(filters);

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'ADMIN_API_getJobStats',
      error,
      data: req.query,
    });
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_ADMIN_SCHEDULER = {
  scheduleJob,
  getScheduledJobs,
  getJobById,
  getJobsByTournament,
  getJobStats,
};
