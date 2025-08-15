import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
  const startTime = Date.now();

  console.log(`---------------------------------START [${targetEnv}]----`);

  try {
    const schedulerResponse = await axios.post(event.endpoint, null, {
      headers: { 
        'X-Internal-Token': INTERNAL_TOKEN,
      },
    });

    Sentry.captureMessage(`🔄 LAMBDA | CREATE SCHEDULES | success | ${targetEnv}`, {
      level: 'info',
      tags: {
        domain: 'DATA_PROVIDER',
        component: 'LAMBDA',
        operation: 'CREATE',
        resource: 'SCHEDULES',
        environment: targetEnv,
        status: 'success',
        function: 'caller-daily-routine'
      },
      extra: {
        timestamp: new Date().toISOString(),
        schedulesData: schedulerResponse.data,
        duration: `${Date.now() - startTime}ms`,
        endpoint: event.endpoint
      },
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
        domain: 'DATA_PROVIDER',
        component: 'LAMBDA',
        operation: 'CREATE',
        resource: 'SCHEDULES',
        environment: targetEnv,
        status: 'error',
        function: 'caller-daily-routine'
      },
      extra: {
        timestamp: new Date().toISOString(),
        endpoint: event.endpoint,
        duration: `${Date.now() - startTime}ms`
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
