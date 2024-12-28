import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { TournamentQuery } from '../../tournament/queries';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new SchedulerClient({ region: 'us-east-1' });

export const createSchedule = async ({
  targetInput,
  targetArn = 'arn:aws:lambda:us-east-1:905418297381:function:scheduler-caller-demo',
  tournament,
  groupName,
}: {
  tournament: TournamentQuery;
  targetInput: Object;
  targetArn?: string;
  groupName: string;
}) => {
  console.log(`[LOG] - [START] - Schedule for ${tournament?.label} calling ${targetArn}`);

  const startDate = dayjs().utc().add(1, 'minute');
  const endDate = startDate.add(1, 'year');
  const SCHEDULE_ID = `rounds_${tournament?.label
    .toLowerCase()
    .replace(/[\s\/\-]+/gi, '_')}`;

  const params = {
    Name: SCHEDULE_ID,
    ScheduleExpression: `rate(1 hour)`,
    ScheduleExpressionTimezone: 'UTC',
    StartDate: startDate.toDate(),
    EndDate: endDate.toDate(),
    State: 'ENABLED' as const,
    FlexibleTimeWindow: { Mode: 'OFF' as const },
    ActionAfterCompletion: undefined,
    GroupName: groupName,
    Target: {
      Arn: targetArn,
      RoleArn: 'arn:aws:iam::905418297381:role/service-role/scheduler-user-demo',
      Input: JSON.stringify(targetInput),
    },
  };

  const command = new CreateScheduleCommand(params);
  const response = await client.send(command);
  console.log(`[LOG] - [END] - Schedule created: ${response.ScheduleArn}`);

  return response.ScheduleArn;
};
