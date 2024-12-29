import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { createDailyScoresAndStandingsRoutine } from './create-daily-schedule-for-match';
import { createKnockoutNewRoundsRoutine } from './create-knockout-new-rounds-routine';
dayjs.extend(utc);

export const SchedulerController = {
  createDailyScoresAndStandingsRoutine,
  createKnockoutNewRoundsRoutine,
};
