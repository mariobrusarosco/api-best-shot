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

export const scheduleNewRoundsAndMatchesRoutine = async (schedule: {
  targetInput: Object;
  id: string;
}) => {
  const StartDate = dayjs().utc().add(1, 'minute').toDate();
  const GroupName = 'new-rounds-and-matches';
  const targetArn =
    'arn:aws:lambda:us-east-1:905418297381:function:caller-new-rounds-and-matches';
  const ScheduleExpression = 'rate(2 day)';

  console.log(
    `[LOG] - [START] - New Rounds and Matches for ${schedule.targetInput} calling ${targetArn} at ${ScheduleExpression}`
  );

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
      RoleArn: 'arn:aws:iam::905418297381:role/service-role/scheduler-user-demo',
      Input: JSON.stringify(schedule.targetInput),
    },
  } satisfies CreateScheduleCommandInput;

  const command = new CreateScheduleCommand(params);
  const response = await client.send(command);
  console.log(`[LOG] - [END] - Scores And Standings Routine: ${response.ScheduleArn}`);

  return response.ScheduleArn;
};