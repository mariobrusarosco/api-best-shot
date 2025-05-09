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

export const scheduleKnockoutsUpdateRoutine = async (schedule: {
  targetInput: Object;
  id: string;
}) => {
  try {
    const StartDate = dayjs().utc().add(1, 'minute').toDate();
    const GroupName = 'knockouts-update';
    const targetArn =
      'arn:aws:lambda:us-east-1:905418297381:function:caller-knockouts-update';
    const ScheduleExpression = 'rate(1 day)';

    const params = {
      Name: schedule.id,
      ScheduleExpression,
      ScheduleExpressionTimezone: 'UTC',
      StartDate,
      State: 'ENABLED' as const,
      FlexibleTimeWindow: { Mode: 'OFF' as const },
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
      msg: '[DATA PROVIDER] - [KNOCKOUTS UPDATE]',
      data: {
        targetArn,
        scheduled: response.ScheduleArn,
      },
      color: 'FgGreen'
    });

    return response.ScheduleArn;
  } catch (error) {
    Profiling.error('[DATA PROVIDER] - [KNOCKOUTS UPDATE]: ', error);
  }
};
