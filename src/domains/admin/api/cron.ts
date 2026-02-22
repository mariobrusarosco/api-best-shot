import { SERVICES_CRON } from '@/domains/cron/services';
import { CRON_JOB_SCHEDULE_TYPES, ICronJobScheduleType } from '@/domains/cron/typing';
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

type CronVersionBody = {
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

  async createNewVersion(req: Request<{ jobId: string }, unknown, CronVersionBody>, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const body = req.body || {};
      const updates: Record<string, unknown> = {};

      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'target')) {
        if (body.target !== undefined && (typeof body.target !== 'string' || !body.target.trim())) {
          return res.status(400).json({
            success: false,
            message: 'target must be a non-empty string when provided',
          });
        }

        updates.target = typeof body.target === 'string' ? body.target.trim() : body.target;
      }
      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'payload')) {
        updates.payload = parsePayload(body.payload);
      }
      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'scheduleType')) {
        updates.scheduleType = parseScheduleType(body.scheduleType);
      }
      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'cronExpression')) {
        if (
          body.cronExpression !== null &&
          body.cronExpression !== undefined &&
          typeof body.cronExpression !== 'string'
        ) {
          return res.status(400).json({
            success: false,
            message: 'cronExpression must be a string, null, or omitted',
          });
        }

        updates.cronExpression = body.cronExpression;
      }
      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'runAt')) {
        updates.runAt = parseOptionalDate(body.runAt, 'runAt');
      }
      // TODO: Reason about the need, the readability of this kind o validation
      if (Object.prototype.hasOwnProperty.call(body, 'timezone')) {
        updates.timezone = parseTimezone(body.timezone);
      }

      const updatedBy = getUpdatedByFromRequest(req);
      updates.updatedBy = updatedBy;
      updates.createdBy = updatedBy;

      const result = await SERVICES_CRON.createNewVersion(jobId, updates, updatedBy);

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Cron job new version created successfully',
      });
    } catch (error) {
      return res.status(getErrorStatus(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create cron job new version',
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
};
