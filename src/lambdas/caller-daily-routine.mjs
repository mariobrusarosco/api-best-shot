import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

  try {
    const schedulerResponse = await axios.post(event.endpoint, null, {
      headers: { 
        'X-Internal-Token': INTERNAL_TOKEN,
      },
    });

    Sentry.captureMessage(`[LOG] - [LAMBDA] - [CALLER DAILY ROUTINE] [${targetEnv}]`, {
      level: 'log',
      extra: { schedulerResponse: null },
    });

    console.log('[END] - Daily routine completed for:', targetEnv);

    return {
      statusCode: 200,
      body: schedulerResponse.data,
    };
  } catch (error) {
    Sentry.captureException(
      `[ERROR] - [LAMBDA] - [CALLER DAILY ROUTINE] [${targetEnv}]`,
      {
        extra: { error },
      }
    );
    return {
      statusCode: 500,
      body: error,
    };
  }
});
