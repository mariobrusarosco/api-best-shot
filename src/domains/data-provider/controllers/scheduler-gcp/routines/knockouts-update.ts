import Profiling from '@/services/profiling';
import { CloudSchedulerClient } from '@google-cloud/scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new CloudSchedulerClient();

export const scheduleKnockoutsUpdateRoutine = async (schedule: {
  targetInput: Record<string, unknown>;
  id: string;
}) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    const cloudFunctionUrl = process.env.GCP_KNOCKOUTS_UPDATE_FUNCTION_URL;
    
    if (!projectId || !cloudFunctionUrl) {
      throw new Error('Missing required GCP environment variables');
    }

    const parent = `projects/${projectId}/locations/${location}`;
    const jobName = `${parent}/jobs/${schedule.id}`;
    const cronExpression = '0 0 * * *'; // Daily at midnight UTC

    const job = {
      name: jobName,
      description: 'Scheduled job for knockouts update routine',
      schedule: cronExpression,
      timeZone: 'UTC',
      httpTarget: {
        uri: cloudFunctionUrl,
        httpMethod: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify(schedule.targetInput)),
      },
    };

    const [response] = await client.createJob({
      parent,
      job,
    });

    Profiling.log({
      msg: 'KNOCKOUTS UPDATE SCHEDULED (GCP)',
      data: {
        cloudFunctionUrl,
        scheduled: response.name,
        cronExpression,
      },
      source: 'DATA_PROVIDER_SCHEDULER_GCP_knockoutsUpdate',
    });

    return response.name;
  } catch (error) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_GCP_knockoutsUpdate',
      error,
    });
    throw error;
  }
};