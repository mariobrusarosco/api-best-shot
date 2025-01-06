import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Request, Response } from 'express';
import { scheduleScoresAndStandingsRoutine } from '../../controllers/scheduler/routines/scores-and-standings';
import { Utils } from '../../controllers/scheduler/utils';

dayjs.extend(utc);

const dailyRoutine = async (req: Request, res: Response) => {
  try {
    const temp = await scheduleScoresAndStandingsRoutine({
      cronExpression: Utils.toCronFormat(dayjs.utc().add(3, 'minute')),
      targetInput: {
        standingsUrl:
          'https://api-best-shot.mariobrusarosco.com/api/v1/data-provider/tournaments/c0389d9b-41f4-4ffb-b473-d13fabd758ae/standings',
        roundUrl:
          'https://api-best-shot-demo.mariobrusarosco.com/api/v1/data-provider/tournaments/c0389d9b-41f4-4ffb-b473-d13fabd758ae/matches/20',
        envTarget: 'demo',
      },
      id: Math.random().toString(),
    });
    Profiling.log('[DATA PROVIDER] - [TEMP]', {
      temp,
    });

    return res.status(200).send(temp);
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [DAILY SCHEDULER]', error);
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Scheduler = {
  dailyRoutine,
};
