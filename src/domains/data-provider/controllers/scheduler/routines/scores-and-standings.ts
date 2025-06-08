import Profiling from '@/services/profiling';
import {
  CreateScheduleCommand,
  CreateScheduleCommandInput,
  SchedulerClient,
} from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new SchedulerClient({ region: 'us-east-1' });

export const scheduleScoresAndStandingsRoutine = async (schedule: {
  cronExpression: string;
  targetInput: Object;
  id: string;
}) => {
  try {
    const StartDate = dayjs().utc().add(1, 'minute').toDate();
    const GroupName = 'scores-and-standings-routine';
    const targetArn =
      'arn:aws:lambda:us-east-1:905418297381:function:caller-scores-and-standings';

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
        RoleArn: 'arn:aws:iam::905418297381:role/root-scheduler',
        Input: JSON.stringify(schedule.targetInput),
      },
    } satisfies CreateScheduleCommandInput;

    const command = new CreateScheduleCommand(params);
    const response = await client.send(command);

    Profiling.log({
      msg: 'SCORES AND STANDINGS ROUTINE SCHEDULED',
      data: {
        targetArn,
        scheduled: response.ScheduleArn,
      },
      source: 'DATA_PROVIDER_SCHEDULER_scoresAndStandings',
    });

    return response.ScheduleArn;
  } catch (error) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_scoresAndStandings',
      error,
    });
  }
};
