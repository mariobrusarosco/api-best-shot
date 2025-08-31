import { env } from '@/config/env';
import Profiling from '@/services/profiling';
import { CreateScheduleCommand, CreateScheduleCommandInput, SchedulerClient } from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { SchedulerService } from '@/domains/data-provider/services/data-provider-jobs';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new SchedulerClient({ region: env.AWS_REGION });

export const scheduleScoresAndStandingsRoutine = async (schedule: {
  cronExpression: string;
  targetInput: Record<string, unknown>;
  id: string;
  tournamentId: string;
  matchId?: string;
  matchExternalId?: string;
  matchProvider?: string;
  roundSlug?: string;
}) => {
  try {
    const StartDate = dayjs().utc().add(1, 'minute').toDate();
    const GroupName = 'scores-and-standings-routine';
    const targetArn = `arn:aws:lambda:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:function:caller-scores-and-standings`;
    const environment = process.env.NODE_ENV || 'development';

    // Check for duplicate schedule to prevent conflicts
    const isDuplicate = await SchedulerService.checkForDuplicateSchedule(schedule.id);
    if (isDuplicate) {
      Profiling.log({
        msg: 'DUPLICATE SCHEDULE DETECTED - SKIPPING',
        data: { scheduleId: schedule.id },
        source: 'DATA_PROVIDER_SCHEDULER_scoresAndStandings',
      });
      return null;
    }

    // Track the schedule creation in database
    await SchedulerService.trackScheduleCreation({
      scheduleId: schedule.id,
      scheduleType: 'scores_and_standings',
      cronExpression: schedule.cronExpression,
      targetLambdaArn: targetArn,
      targetInput: schedule.targetInput,
      tournamentId: schedule.tournamentId,
      matchId: schedule.matchId,
      matchExternalId: schedule.matchExternalId,
      matchProvider: schedule.matchProvider,
      roundSlug: schedule.roundSlug,
      environment,
    });

    const params = {
      Name: schedule.id,
      ScheduleExpression: schedule.cronExpression,
      ScheduleExpressionTimezone: 'UTC',
      StartDate,
      State: 'ENABLED' as const,
      FlexibleTimeWindow: { Mode: 'OFF' as const },
      ActionAfterCompletion: 'NONE' as const,
      GroupName,
      Target: {
        Arn: targetArn,
        RoleArn: `arn:aws:iam::${env.AWS_ACCOUNT_ID}:role/root-scheduler`,
        Input: JSON.stringify(schedule.targetInput),
      },
    } satisfies CreateScheduleCommandInput;

    const command = new CreateScheduleCommand(params);
    const response = await client.send(command);

    // Mark as successfully scheduled in AWS
    if (response.ScheduleArn) {
      await SchedulerService.markScheduleAsScheduled(schedule.id, response.ScheduleArn, StartDate);
    }

    Profiling.log({
      msg: 'SCORES AND STANDINGS ROUTINE SCHEDULED',
      data: {
        targetArn,
        scheduled: response.ScheduleArn,
        scheduleId: schedule.id,
      },
      source: 'DATA_PROVIDER_SCHEDULER_scoresAndStandings',
    });

    return response.ScheduleArn;
  } catch (error) {
    // Track the failure in database
    await SchedulerService.trackScheduleFailure(schedule.id, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_scoresAndStandings',
      error,
      data: { scheduleId: schedule.id },
    });
    throw error;
  }
};
