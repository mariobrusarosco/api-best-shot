import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler';
import type { SchedulerJobStatus } from '../../../schema/scheduler-jobs';

interface SchedulerCallbackRequest {
  scheduleId: string;
  status: SchedulerJobStatus;
  executionId?: string;
  executionStatus?: string;
  executionError?: Record<string, unknown>;
  triggeredAt?: string;
  executedAt?: string;
  completedAt?: string;
}

const handleSchedulerCallback = async (req: Request, res: Response) => {
  const startTime = new Date();
  const friendlyTimestamp = startTime.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

  try {
    console.log(`🔔 [${friendlyTimestamp}] Scheduler callback received...`);

    const callbackData = req.body as SchedulerCallbackRequest;

    // Validate required fields
    if (!callbackData.scheduleId || !callbackData.status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: scheduleId and status',
      });
    }

    // Parse dates if provided
    const executionDetails: {
      triggeredAt?: Date;
      executedAt?: Date;
      completedAt?: Date;
      executionId?: string;
      executionStatus?: string;
      executionError?: Record<string, unknown>;
    } = {};

    if (callbackData.triggeredAt) {
      executionDetails.triggeredAt = new Date(callbackData.triggeredAt);
    }
    if (callbackData.executedAt) {
      executionDetails.executedAt = new Date(callbackData.executedAt);
    }
    if (callbackData.completedAt) {
      executionDetails.completedAt = new Date(callbackData.completedAt);
    }
    if (callbackData.executionId) {
      executionDetails.executionId = callbackData.executionId;
    }
    if (callbackData.executionStatus) {
      executionDetails.executionStatus = callbackData.executionStatus;
    }
    if (callbackData.executionError) {
      executionDetails.executionError = callbackData.executionError;
    }

    // Handle different status updates
    switch (callbackData.status) {
      case 'triggered':
        if (callbackData.executionId) {
          await SchedulerService.trackScheduleExecution(
            callbackData.scheduleId,
            callbackData.executionId,
            executionDetails.triggeredAt
          );
        }
        break;

      case 'executing':
        await SchedulerService.trackScheduleExecutionStart(callbackData.scheduleId, executionDetails.executedAt);
        break;

      case 'completed':
        await SchedulerService.trackScheduleCompletion(
          callbackData.scheduleId,
          callbackData.executionStatus || 'success',
          executionDetails.completedAt
        );
        break;

      case 'failed':
        await SchedulerService.trackScheduleFailure(
          callbackData.scheduleId,
          callbackData.executionError || { message: 'Unknown failure' },
          callbackData.executionStatus,
          executionDetails.completedAt
        );
        break;

      case 'cancelled':
        await SchedulerService.cancelSchedule(
          callbackData.scheduleId,
          (callbackData.executionError?.reason as string) || 'Cancelled via callback'
        );
        break;

      default:
        console.warn(`Unknown status received: ${callbackData.status}`);
        return res.status(400).json({
          success: false,
          error: `Unknown status: ${callbackData.status}`,
        });
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const endTimestamp = endTime.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

    console.log(`✅ [${endTimestamp}] Scheduler callback processed successfully!`);
    console.log(`📊 Updated schedule ${callbackData.scheduleId} to status ${callbackData.status} in ${duration}ms`);

    Profiling.log({
      msg: 'SCHEDULER CALLBACK PROCESSED',
      data: {
        scheduleId: callbackData.scheduleId,
        status: callbackData.status,
        executionId: callbackData.executionId,
        duration: `${duration}ms`,
        startTime: friendlyTimestamp,
        endTime: endTimestamp,
      },
      source: 'DATA_PROVIDER_SCHEDULER_callback',
    });

    return res.status(200).json({
      success: true,
      message: `Scheduler callback processed successfully at ${endTimestamp}`,
      scheduleId: callbackData.scheduleId,
      status: callbackData.status,
      duration: `${duration}ms`,
      timestamp: endTimestamp,
    });
  } catch (error: unknown) {
    const errorTimestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
    console.error(`❌ [${errorTimestamp}] Scheduler callback failed:`, error);

    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_callback',
      error,
      data: {
        body: req.body,
        timestamp: errorTimestamp,
      },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_SCHEDULER_CALLBACK = {
  handleSchedulerCallback,
};
