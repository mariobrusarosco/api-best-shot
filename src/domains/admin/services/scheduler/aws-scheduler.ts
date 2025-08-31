import { CreateScheduleCommand, CreateScheduleCommandInput, SchedulerClient } from '@aws-sdk/client-scheduler';
import { env } from '@/config/env';
import Profiling from '@/services/profiling';

const client = new SchedulerClient({ region: env.AWS_REGION });

interface CreateScheduleParams {
  scheduleId: string;
  cronExpression: string;
  startDate: Date;
  endDate: Date;
  lambdaArn: string;
  targetPayload: Record<string, unknown>;
  groupName: string;
}

/**
 * Create a schedule in AWS EventBridge Scheduler
 */
export async function createAWSSchedule(params: CreateScheduleParams): Promise<string> {
  try {
    const scheduleParams: CreateScheduleCommandInput = {
      Name: params.scheduleId,
      ScheduleExpression: params.cronExpression,
      ScheduleExpressionTimezone: 'UTC',
      StartDate: params.startDate,
      EndDate: params.endDate, // Schedule will stop after duration
      State: 'ENABLED',
      FlexibleTimeWindow: { Mode: 'OFF' },
      ActionAfterCompletion: 'DELETE', // Auto-delete after completion
      GroupName: params.groupName,
      Target: {
        Arn: params.lambdaArn,
        RoleArn: `arn:aws:iam::${env.AWS_ACCOUNT_ID}:role/${env.AWS_SCHEDULER_ROLE_NAME}`,
        Input: JSON.stringify(params.targetPayload),
        RetryPolicy: {
          MaximumRetryAttempts: 3,
          MaximumEventAgeInSeconds: 3600, // 1 hour
        },
      },
    };

    const command = new CreateScheduleCommand(scheduleParams);
    const response = await client.send(command);

    if (!response.ScheduleArn) {
      throw new Error('AWS did not return a Schedule ARN');
    }

    Profiling.log({
      msg: 'AWS SCHEDULER - Schedule created successfully',
      data: {
        scheduleId: params.scheduleId,
        scheduleArn: response.ScheduleArn,
        groupName: params.groupName,
      },
      source: 'AWS_SCHEDULER_createSchedule',
    });

    return response.ScheduleArn;
  } catch (error) {
    Profiling.error({
      source: 'AWS_SCHEDULER_createSchedule',
      error,
      data: {
        scheduleId: params.scheduleId,
        groupName: params.groupName,
      },
    });
    throw error;
  }
}
