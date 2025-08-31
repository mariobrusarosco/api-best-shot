import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { QUERIES_SCHEDULER_JOBS } from '../../../queries/scheduler-jobs';
import { SchedulerService } from '../../../services/scheduler';
import type { SchedulerJobStatus, SchedulerJobType } from '../../../schema/scheduler-jobs';

// Get all scheduler jobs with pagination and filters
const getAllJobs = async (req: Request, res: Response) => {
  try {
    const { status, scheduleType, environment, tournamentId, limit = '50', offset = '0' } = req.query;

    // Parse status (can be single value or array)
    let statusFilter: SchedulerJobStatus | SchedulerJobStatus[] | undefined;
    if (status) {
      if (typeof status === 'string') {
        statusFilter = status.includes(',')
          ? (status.split(',') as SchedulerJobStatus[])
          : (status as SchedulerJobStatus);
      }
    }

    const jobs = await QUERIES_SCHEDULER_JOBS.getAllSchedulerJobs({
      status: statusFilter,
      scheduleType: scheduleType as SchedulerJobType,
      environment: environment as string,
      tournamentId: tournamentId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    Profiling.log({
      msg: 'SCHEDULER JOBS RETRIEVED',
      data: {
        count: jobs.length,
        filters: { status, scheduleType, environment, tournamentId },
      },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getAllJobs',
    });

    return res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length,
      filters: {
        status,
        scheduleType,
        environment,
        tournamentId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getAllJobs',
      error,
      data: { query: req.query },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Get specific job by ID
const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    const job = await QUERIES_SCHEDULER_JOBS.getSchedulerJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Scheduler job not found',
      });
    }

    Profiling.log({
      msg: 'SCHEDULER JOB RETRIEVED BY ID',
      data: { jobId: id, scheduleId: job.scheduleId },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getJobById',
    });

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getJobById',
      error,
      data: { jobId: req.params.id },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Get jobs by tournament ID
const getJobsByTournament = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;
    const { scheduleType, status, environment, limit = '50', offset = '0' } = req.query;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required',
      });
    }

    const jobs = await QUERIES_SCHEDULER_JOBS.getSchedulerJobsByTournament(tournamentId, {
      scheduleType: scheduleType as SchedulerJobType,
      status: status as SchedulerJobStatus,
      environment: environment as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    Profiling.log({
      msg: 'SCHEDULER JOBS RETRIEVED BY TOURNAMENT',
      data: {
        tournamentId,
        count: jobs.length,
        filters: { scheduleType, status, environment },
      },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getJobsByTournament',
    });

    return res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length,
      tournamentId,
      filters: {
        scheduleType,
        status,
        environment,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getJobsByTournament',
      error,
      data: { tournamentId: req.params.tournamentId, query: req.query },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Get active jobs (pending or scheduled)
const getActiveJobs = async (req: Request, res: Response) => {
  try {
    const { scheduleType, environment, limit = '50' } = req.query;

    const jobs = await QUERIES_SCHEDULER_JOBS.getActiveSchedulerJobs({
      scheduleType: scheduleType as SchedulerJobType,
      environment: environment as string,
      limit: parseInt(limit as string),
    });

    Profiling.log({
      msg: 'ACTIVE SCHEDULER JOBS RETRIEVED',
      data: {
        count: jobs.length,
        filters: { scheduleType, environment },
      },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getActiveJobs',
    });

    return res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length,
      filters: {
        scheduleType,
        environment,
        limit: parseInt(limit as string),
      },
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getActiveJobs',
      error,
      data: { query: req.query },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Get failed jobs that can be retried
const getFailedJobs = async (req: Request, res: Response) => {
  try {
    const { scheduleType, environment, maxRetries = '3', limit = '50' } = req.query;

    const jobs = await QUERIES_SCHEDULER_JOBS.getFailedSchedulerJobs({
      scheduleType: scheduleType as SchedulerJobType,
      environment: environment as string,
      maxRetries: parseInt(maxRetries as string),
      limit: parseInt(limit as string),
    });

    Profiling.log({
      msg: 'FAILED SCHEDULER JOBS RETRIEVED',
      data: {
        count: jobs.length,
        filters: { scheduleType, environment, maxRetries },
      },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getFailedJobs',
    });

    return res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length,
      filters: {
        scheduleType,
        environment,
        maxRetries: parseInt(maxRetries as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getFailedJobs',
      error,
      data: { query: req.query },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Get scheduler statistics
const getStats = async (req: Request, res: Response) => {
  try {
    const { tournamentId, environment, scheduleType } = req.query;

    const stats = await SchedulerService.getSchedulerStats({
      tournamentId: tournamentId as string,
      environment: environment as string,
      scheduleType: scheduleType as SchedulerJobType,
    });

    Profiling.log({
      msg: 'SCHEDULER STATS RETRIEVED',
      data: {
        stats,
        filters: { tournamentId, environment, scheduleType },
      },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getStats',
    });

    return res.status(200).json({
      success: true,
      data: stats,
      filters: {
        tournamentId,
        environment,
        scheduleType,
      },
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_getStats',
      error,
      data: { query: req.query },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

// Retry a failed job (placeholder - would need AWS integration)
const retryJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    const job = await QUERIES_SCHEDULER_JOBS.getSchedulerJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Scheduler job not found',
      });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed jobs can be retried',
      });
    }

    // TODO: Implement actual retry logic by recreating AWS schedule
    // For now, just increment retry count and mark as pending
    await QUERIES_SCHEDULER_JOBS.incrementRetryCount(job.scheduleId);
    const updatedJob = await QUERIES_SCHEDULER_JOBS.updateSchedulerJobStatus(job.scheduleId, 'pending');

    Profiling.log({
      msg: 'SCHEDULER JOB RETRY INITIATED',
      data: { jobId: id, scheduleId: job.scheduleId },
      source: 'DATA_PROVIDER_SCHEDULER_monitor_retryJob',
    });

    return res.status(200).json({
      success: true,
      message: 'Job retry initiated',
      data: updatedJob,
    });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_monitor_retryJob',
      error,
      data: { jobId: req.params.id },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_SCHEDULER_MONITOR = {
  getAllJobs,
  getJobById,
  getJobsByTournament,
  getActiveJobs,
  getFailedJobs,
  getStats,
  retryJob,
};
