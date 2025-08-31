import { env } from '@/config/env';
import Profiling from '@/services/profiling';
import { CreateScheduleCommand, CreateScheduleCommandInput, SchedulerClient } from '@aws-sdk/client-scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { SchedulerService } from '../../../services/data-provider-jobs';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new SchedulerClient({ region: env.AWS_REGION });

export const scheduleKnockoutsUpdateRoutine = async (schedule: {
  targetInput: Record<string, unknown>;
  id: string;
  tournamentId: string;
}) => {
  try {
    const StartDate = dayjs().utc().add(1, 'minute').toDate();
    const GroupName = 'knockouts-update';
    const targetArn = `arn:aws:lambda:${env.AWS_REGION}:905418297381:function:caller-knockouts-update`;
    const ScheduleExpression = 'rate(2 days)';
    const environment = process.env.NODE_ENV || 'development';

    // Check for duplicate schedule to prevent conflicts
    const isDuplicate = await SchedulerService.checkForDuplicateSchedule(schedule.id);
    if (isDuplicate) {
      Profiling.log({
        msg: 'DUPLICATE KNOCKOUT SCHEDULE DETECTED - SKIPPING',
        data: { scheduleId: schedule.id },
        source: 'DATA_PROVIDER_SCHEDULER_knockoutsUpdate',
      });
      return null;
    }

    // Track the schedule creation in database
    await SchedulerService.trackScheduleCreation({
      scheduleId: schedule.id,
      scheduleType: 'knockouts_update',
      targetLambdaArn: targetArn,
      targetInput: schedule.targetInput,
      tournamentId: schedule.tournamentId,
      environment,
    });

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

    // Mark as successfully scheduled in AWS
    if (response.ScheduleArn) {
      await SchedulerService.markScheduleAsScheduled(schedule.id, response.ScheduleArn, StartDate);
    }

    Profiling.log({
      msg: 'KNOCKOUTS UPDATE SCHEDULED',
      data: {
        targetArn,
        scheduled: response.ScheduleArn,
        scheduleId: schedule.id,
      },
      source: 'DATA_PROVIDER_SCHEDULER_knockoutsUpdate',
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
      source: 'DATA_PROVIDER_SCHEDULER_knockoutsUpdate',
      error,
      data: { scheduleId: schedule.id },
    });
    throw error;
  }
};
