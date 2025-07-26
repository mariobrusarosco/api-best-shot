import Profiling from '@/services/profiling';
import { CloudSchedulerClient } from '@google-cloud/scheduler';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(isToday);

const client = new CloudSchedulerClient();

export const scheduleScoresAndStandingsRoutine = async (schedule: {
  cronExpression: string;
  targetInput: Record<string, unknown>;
  id: string;
}) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    const cloudFunctionUrl = process.env.GCP_SCORES_STANDINGS_FUNCTION_URL;
    
    if (!projectId || !cloudFunctionUrl) {
      throw new Error('Missing required GCP environment variables');
    }

    const parent = `projects/${projectId}/locations/${location}`;
    const jobName = `${parent}/jobs/${schedule.id}`;

    const job = {
      name: jobName,
      description: 'Scheduled job for scores and standings routine',
      schedule: schedule.cronExpression,
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
      msg: 'SCORES AND STANDINGS ROUTINE SCHEDULED (GCP)',
      data: {
        cloudFunctionUrl,
        scheduled: response.name,
        cronExpression: schedule.cronExpression,
      },
      source: 'DATA_PROVIDER_SCHEDULER_GCP_scoresAndStandings',
    });

    return response.name;
  } catch (error) {
    Profiling.error({
      source: 'DATA_PROVIDER_SCHEDULER_GCP_scoresAndStandings',
      error,
    });
    throw error;
  }
};