import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

  console.log(`---------------------------------START [${targetEnv}]----`);

  try {
    const schedulerResponse = await axios.post(event.endpoint, null, {
      headers: { 
        'X-Internal-Token': INTERNAL_TOKEN,
      },
    });

    Sentry.captureMessage(`[LOG] - [LAMBDA] - [CALLER DAILY ROUTINE] [${targetEnv}]`, {
      level: 'log',
      extra: { schedulerResponse: schedulerResponse.data },
    });

    console.log(`[END] - Daily routine completed for: ${targetEnv}`);
    console.log('Scheduler response:', schedulerResponse.status, schedulerResponse.statusText);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily routine completed successfully',
        environment: targetEnv,
        schedulesCreated: schedulerResponse.data
      }),
    };
  } catch (error) {
    console.error(`[ERROR] Daily routine failed for ${targetEnv}:`, error.message);

    Sentry.captureException(error, {
      tags: { 
        environment: targetEnv,
        function: 'caller-daily-routine'
      },
      extra: { 
        endpoint: event.endpoint,
        targetEnv: targetEnv
      }
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Daily routine failed',
        message: error.message,
        environment: targetEnv
      }),
    };
  }
});
