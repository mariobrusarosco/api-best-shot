import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SchedulerGCPController } from '@/domains/data-provider/services/scheduler-gcp';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { SchedulerRequest } from './typing';

const createDailySchedules = async (req: SchedulerRequest, res: Response) => {
  const requestId = randomUUID();
  
  try {
    Profiling.log({
      msg: `[REQUEST START] Daily scheduler setup request received`,
      data: { 
        requestId,
        timestamp: new Date().toISOString()
      },
      source: 'DATA_PROVIDER_V2_SCHEDULER_createDailySchedules',
    });

    Profiling.log({
      msg: `[SCHEDULER START] Creating daily schedules for today's matches`,
      data: { requestId },
      source: 'DATA_PROVIDER_V2_SCHEDULER_createDailySchedules',
    });

    const schedules = await SchedulerGCPController.createDailyScoresAndStandingsRoutine();

    if (!schedules || schedules.size === 0) {
      Profiling.log({
        msg: `[SCHEDULER COMPLETE] No matches found for today - no schedules created`,
        data: { 
          requestId,
          schedulesCount: 0,
          note: 'No matches scheduled for today'
        },
        source: 'DATA_PROVIDER_V2_SCHEDULER_createDailySchedules',
      });

      return res.status(200).json({ 
        success: true,
        message: 'Daily scheduler setup completed - no matches today',
        schedulesCreated: 0,
        schedules: []
      });
    }

    const schedulesArray = Array.from(schedules.values());

    Profiling.log({
      msg: `[SCHEDULER COMPLETE] Daily schedules created successfully`,
      data: { 
        requestId,
        schedulesCount: schedules.size,
        scheduleIds: schedulesArray.map(s => s.id)
      },
      source: 'DATA_PROVIDER_V2_SCHEDULER_createDailySchedules',
    });

    return res.status(200).json({ 
      success: true,
      message: 'Daily scheduler setup completed successfully',
      schedulesCreated: schedules.size,
      schedules: schedulesArray.map(schedule => ({
        id: schedule.id,
        cronExpression: schedule.cronExpression,
        startDate: schedule.startDate,
        targetUrls: {
          standings: schedule.targetInput.standingsUrl,
          round: schedule.targetInput.roundUrl
        }
      }))
    });

  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_SCHEDULER_createDailySchedules',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const API_SCHEDULER_V2 = {
  createDailySchedules,
};

export default API_SCHEDULER_V2;