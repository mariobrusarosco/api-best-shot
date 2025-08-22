import Profiling from '@/services/profiling';
import { CreateScheduleCommand, CreateScheduleCommandInput, SchedulerClient } from '@aws-sdk/client-scheduler';
import { env } from '@/config/env';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new SchedulerClient({ region: env.AWS_REGION });

export const scheduleKnockoutsUpdateRoutine = async (schedule: {
  targetInput: Record<string, unknown>;
  id: string;
}) => {
  try {
    const StartDate = dayjs().utc().add(1, 'minute').toDate();
    const GroupName = 'knockouts-update';
    const targetArn = `arn:aws:lambda:${env.AWS_REGION}:905418297381:function:caller-knockouts-update`;
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
        RoleArn: `arn:aws:iam::905418297381:role/root-scheduler`,
        Input: JSON.stringify(schedule.targetInput),
      },
    } satisfies CreateScheduleCommandInput;

    const command = new CreateScheduleCommand(params);
    const response = await client.send(command);

    Profiling.log({
      msg: 'KNOCKOUTS UPDATE SCHEDULED',
      data: {
        targetArn,
        scheduled: response.ScheduleArn,
      },
      source: 'DATA_PROVIDER_SCHEDULER_knockoutsUpdate',
    });

    return response.ScheduleArn;
  } catch (error) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_knockoutsUpdate',
      error,
    });
  }
};
