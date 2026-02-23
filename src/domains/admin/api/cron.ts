import { SERVICES_CRON } from '@/domains/cron/services';
import { QUERIES_CRON_JOB_RUNS } from '@/domains/cron/queries';
import {
  CRON_JOB_DEFINITION_STATUSES,
  CRON_JOB_SCHEDULE_TYPES,
  CRON_RUN_STATUSES,
  CRON_RUN_TRIGGER_TYPES,
  ICronJobScheduleType,
} from '@/domains/cron/typing';
import { Request, Response } from 'express';

type CronDefinitionBody = {
  jobKey?: unknown;
  target?: unknown;
  payload?: unknown;
  scheduleType?: unknown;
  cronExpression?: unknown;
  runAt?: unknown;
  timezone?: unknown;
};

type PauseBody = {
  reason?: unknown;
};

type RunNowBody = {
  payload?: unknown;
};

type ListCronJobsQuery = {
  jobKey?: unknown;
  status?: unknown;
  target?: unknown;
  scheduleType?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type ListCronRunsQuery = {
  jobDefinitionId?: unknown;
  jobKey?: unknown;
  status?: unknown;
  triggerType?: unknown;
  target?: unknown;
  limit?: unknown;
  offset?: unknown;
};

// TODO: Move this to a utils file
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// TODO: Move this to a utils file
const parseScheduleType = (value: unknown): ICronJobScheduleType => {
  if (value !== CRON_JOB_SCHEDULE_TYPES.ONE_TIME && value !== CRON_JOB_SCHEDULE_TYPES.RECURRING) {
    throw new Error('Invalid scheduleType. Allowed values: one_time, recurring');
  }

  return value;
};

const parseOptionalDate = (value: unknown, fieldName: string): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Invalid ${fieldName} date`);
    }

    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid ${fieldName} date`);
    }

    return parsed;
  }

  throw new Error(`Invalid ${fieldName} date`);
};

// TODO: Move this to a utils file
const parsePayload = (value: unknown): Record<string, unknown> | null | undefined => {
  if (value === undefined || value === null) return value;

  if (!isObject(value)) {
    throw new Error('Payload must be an object');
  }

  return value;
};

// TODO: Move this to a utils file
const parseTimezone = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Timezone must be a non-empty string');
  }

  return value.trim();
};

const parseOptionalString = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseOptionalInteger = (
  value: unknown,
  fieldName: string,
  options: { min: number; max: number; defaultValue: number }
): number => {
  if (value === undefined) return options.defaultValue;

  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return Math.min(Math.max(parsed, options.min), options.max);
};

const parseOptionalDefinitionStatus = (value: unknown) => {
  const parsed = parseOptionalString(value, 'status');
  if (!parsed) return undefined;

  const allowed = Object.values(CRON_JOB_DEFINITION_STATUSES);
  if (!allowed.includes(parsed as (typeof allowed)[number])) {
    throw new Error(`Invalid status. Allowed values: ${allowed.join(', ')}`);
  }

  return parsed as (typeof allowed)[number];
};

const parseOptionalScheduleType = (value: unknown) => {
  const parsed = parseOptionalString(value, 'scheduleType');
  if (!parsed) return undefined;

  const allowed = Object.values(CRON_JOB_SCHEDULE_TYPES);
  if (!allowed.includes(parsed as (typeof allowed)[number])) {
    throw new Error(`Invalid scheduleType. Allowed values: ${allowed.join(', ')}`);
  }

  return parsed as (typeof allowed)[number];
};

const parseOptionalRunStatus = (value: unknown) => {
  const parsed = parseOptionalString(value, 'status');
  if (!parsed) return undefined;

  const allowed = Object.values(CRON_RUN_STATUSES);
  if (!allowed.includes(parsed as (typeof allowed)[number])) {
    throw new Error(`Invalid status. Allowed values: ${allowed.join(', ')}`);
  }

  return parsed as (typeof allowed)[number];
};

const parseOptionalRunTriggerType = (value: unknown) => {
  const parsed = parseOptionalString(value, 'triggerType');
  if (!parsed) return undefined;

  const allowed = Object.values(CRON_RUN_TRIGGER_TYPES);
  if (!allowed.includes(parsed as (typeof allowed)[number])) {
    throw new Error(`Invalid triggerType. Allowed values: ${allowed.join(', ')}`);
  }

  return parsed as (typeof allowed)[number];
};

// TODO: Move this to a utils file
const getErrorStatus = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message.toLowerCase();

  if (message.includes('not found')) return 404;
  if (message.includes('already exists')) return 409;
  if (
    message.includes('invalid') ||
    message.includes('must') ||
    message.includes('unsupported') ||
    message.includes('only the latest') ||
    message.includes('cannot create')
  ) {
    return 400;
  }

  return 500;
};

// TODO: Move this to a utils file
const getUpdatedByFromRequest = (req: { authenticatedUser?: { nickName?: string } }): string => {
  return req.authenticatedUser?.nickName || 'system';
};

export const API_ADMIN_CRON = {
  async createJob(req: Request<unknown, unknown, CronDefinitionBody>, res: Response) {
    try {
      const { jobKey, target, scheduleType, cronExpression, runAt, payload, timezone } = req.body || {};

      if (typeof jobKey !== 'string' || !jobKey.trim()) {
        return res.status(400).json({
          success: false,
          message: 'jobKey is required and must be a non-empty string',
        });
      }

      if (typeof target !== 'string' || !target.trim()) {
        return res.status(400).json({
          success: false,
          message: 'target is required and must be a non-empty string',
        });
      }

      const parsedScheduleType = parseScheduleType(scheduleType);
      const parsedRunAt = parseOptionalDate(runAt, 'runAt');
      const parsedPayload = parsePayload(payload);
      const parsedTimezone = parseTimezone(timezone) || 'UTC';
      const createdBy = getUpdatedByFromRequest(req);

      const definition = await SERVICES_CRON.createDefinition({
        jobKey: jobKey.trim(),
        target: target.trim(),
        payload: parsedPayload,
        scheduleType: parsedScheduleType,
        cronExpression: typeof cronExpression === 'string' ? cronExpression : null,
        runAt: parsedRunAt,
        timezone: parsedTimezone,
        createdBy,
        updatedBy: createdBy,
        status: 'active',
      });

      return res.status(201).json({
        success: true,
        data: definition,
        message: 'Cron job created successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create cron job',
      });
    }
  },

  async pauseJob(req: Request<{ jobId: string }, unknown, PauseBody>, res: Response) {
    try {
      const { jobId } = req.params;
      const reason = req.body?.reason;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      if (typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'reason is required and must be a string',
        });
      }

      const updatedBy = getUpdatedByFromRequest(req);
      const definition = await SERVICES_CRON.pauseDefinition(jobId, reason, updatedBy);

      return res.status(200).json({
        success: true,
        data: definition,
        message: 'Cron job paused successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pause cron job',
      });
    }
  },

  async resumeJob(req: Request<{ jobId: string }>, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const updatedBy = getUpdatedByFromRequest(req);
      const definition = await SERVICES_CRON.resumeDefinition(jobId, updatedBy);

      return res.status(200).json({
        success: true,
        data: definition,
        message: 'Cron job resumed successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resume cron job',
      });
    }
  },

  async runNow(req: Request<{ jobId: string }, unknown, RunNowBody>, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const payload = req.body ? parsePayload(req.body.payload) : undefined;
      const runQueueResult = await SERVICES_CRON.queueRunNow(jobId, payload);

      return res.status(200).json({
        success: true,
        data: runQueueResult,
        message: 'Run-now request processed',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to queue run-now',
      });
    }
  },

  async listJobs(req: Request<unknown, unknown, unknown, ListCronJobsQuery>, res: Response) {
    try {
      const limit = parseOptionalInteger(req.query.limit, 'limit', {
        min: 1,
        max: 100,
        defaultValue: 20,
      });
      const offset = parseOptionalInteger(req.query.offset, 'offset', {
        min: 0,
        max: 10000,
        defaultValue: 0,
      });

      const jobKey = parseOptionalString(req.query.jobKey, 'jobKey');
      const status = parseOptionalDefinitionStatus(req.query.status);
      const target = parseOptionalString(req.query.target, 'target');
      const scheduleType = parseOptionalScheduleType(req.query.scheduleType);

      const jobs = await SERVICES_CRON.listDefinitions({
        jobKey,
        status,
        target,
        scheduleType,
        limit,
        offset,
      });

      return res.status(200).json({
        success: true,
        data: jobs,
        total: jobs.length,
        limit,
        offset,
        message: 'Cron jobs retrieved successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list cron jobs',
      });
    }
  },

  async getJobById(req: Request<{ jobId: string }>, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const job = await SERVICES_CRON.getDefinitionById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Cron job not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: job,
        message: 'Cron job retrieved successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get cron job',
      });
    }
  },

  async listRuns(req: Request<unknown, unknown, unknown, ListCronRunsQuery>, res: Response) {
    try {
      const limit = parseOptionalInteger(req.query.limit, 'limit', {
        min: 1,
        max: 200,
        defaultValue: 50,
      });
      const offset = parseOptionalInteger(req.query.offset, 'offset', {
        min: 0,
        max: 10000,
        defaultValue: 0,
      });

      const jobDefinitionId = parseOptionalString(req.query.jobDefinitionId, 'jobDefinitionId');
      const jobKey = parseOptionalString(req.query.jobKey, 'jobKey');
      const status = parseOptionalRunStatus(req.query.status);
      const triggerType = parseOptionalRunTriggerType(req.query.triggerType);
      const target = parseOptionalString(req.query.target, 'target');

      const runs = await QUERIES_CRON_JOB_RUNS.listRuns({
        jobDefinitionId,
        jobKey,
        status,
        triggerType,
        target,
        limit,
        offset,
      });

      return res.status(200).json({
        success: true,
        data: runs,
        total: runs.length,
        limit,
        offset,
        message: 'Cron runs retrieved successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list cron runs',
      });
    }
  },

  async getRunById(req: Request<{ runId: string }>, res: Response) {
    try {
      const { runId } = req.params;

      if (!runId) {
        return res.status(400).json({
          success: false,
          message: 'runId is required',
        });
      }

      const run = await QUERIES_CRON_JOB_RUNS.getRunById(runId);
      if (!run) {
        return res.status(404).json({
          success: false,
          message: 'Cron run not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: run,
        message: 'Cron run retrieved successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get cron run',
      });
    }
  },
};
