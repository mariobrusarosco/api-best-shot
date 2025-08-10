import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { SchedulerController } from '../../../controllers/scheduler';

const dailyRoutine = async (_: Request, res: Response) => {
  const startTime = new Date();
  const friendlyTimestamp =
    startTime.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

  try {
    console.log(`🚀 [${friendlyTimestamp}] Starting daily scheduler routine...`);

    const daily = await SchedulerController.createDailyScoresAndStandingsRoutine();
    const scheduleIds = [...daily.keys()];
    const scheduleCount = scheduleIds.length;

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const endTimestamp = endTime.toISOString().replace('T', ' ').split('.')[0] + ' UTC';

    console.log(`✅ [${endTimestamp}] Daily scheduler completed successfully!`);
    console.log(`📊 Created ${scheduleCount} schedule(s) in ${duration}ms:`);
    scheduleIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });

    Profiling.log({
      msg: 'DAILY SCHEDULER SUCCESS',
      data: {
        report: scheduleIds,
        scheduleCount,
        duration: `${duration}ms`,
        startTime: friendlyTimestamp,
        endTime: endTimestamp,
      },
      source: 'DATA_PROVIDER_SCHEDULER_dailyScheduler',
    });

    return res.status(200).json({
      success: true,
      message: `Daily scheduler completed successfully at ${endTimestamp}`,
      schedulesCreated: scheduleCount,
      scheduleIds,
      duration: `${duration}ms`,
      timestamp: endTimestamp,
    });
  } catch (error: unknown) {
    const errorTimestamp =
      new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
    console.error(`❌ [${errorTimestamp}] Daily scheduler failed:`, error);

    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_dailyScheduler',
      error,
      data: { timestamp: errorTimestamp },
    });
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_SCHEDULER = {
  dailyRoutine,
};
