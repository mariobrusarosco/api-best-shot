import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { SchedulerController } from '../../../controllers/scheduler';

const dailyRoutine = async (req: Request, res: Response) => {
  try {
    const daily = await SchedulerController.createDailyScoresAndStandingsRoutine();
    Profiling.log({
      msg: '[DATA PROVIDER] - [DAILY SCHEDULER]',
      data: { report: [...daily.keys()] },
      color: 'FgGreen'
    });

    return res.status(200).send(daily);
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [DAILY SCHEDULER]', error);
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_SCHEDULER = {
  dailyRoutine,
};
