import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { SchedulerController } from '../../../controllers/scheduler';

const dailyRoutine = async (_: Request, res: Response) => {
  try {
    const daily = await SchedulerController.createDailyScoresAndStandingsRoutine();
    Profiling.log({
      msg: 'DAILY SCHEDULER SUCCESS',
      data: { report: [...daily.keys()] },
      source: 'DATA_PROVIDER_SCHEDULER_dailyScheduler',
    });

    return res.status(200).send(daily);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_dailyScheduler',
      error,
    });
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_SCHEDULER = {
  dailyRoutine,
};
