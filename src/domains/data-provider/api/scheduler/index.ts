import { Request, Response } from 'express';
import { SchedulerController } from '../../controllers/scheduler';
const dailyRoutine = async (req: Request, res: Response) => {
  try {
    const daily = await SchedulerController.dailyScoresAndStandingsRoutine();

    return res.status(200).send(daily);
  } catch (error: any) {
    console.error('[ERROR] - SCHEDULER - ', error);
    // handleInternalServerErrorResponse(res, error);
  }
};

export const API_Scheduler = {
  dailyRoutine,
};
