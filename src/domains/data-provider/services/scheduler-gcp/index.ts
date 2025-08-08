import { createDailyScoresAndStandingsRoutine } from './create-daily-schedule-for-match';
import { createKnockoutsUpdatesRoutine } from './create-knockouts-update-routine';
import { JobManager } from './job-manager';

export const SchedulerGCPController = {
  createDailyScoresAndStandingsRoutine,
  createKnockoutsUpdatesRoutine,
  jobManager: JobManager,
};