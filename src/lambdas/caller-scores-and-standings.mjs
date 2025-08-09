import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
  
  console.log(`---------------------------------START [${targetEnv}]----`);

  try {
    try {
      const roundResponse = await axios.patch(event.roundUrl, null, {
        headers: { 
          'X-Internal-Token': INTERNAL_TOKEN,
        },
      });
      Sentry.captureMessage(
        `[LOG] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES]`,
        {
          level: 'log',
          extra: roundResponse.data,
        }
      );
    } catch (error) {
      Sentry.captureException(
        `[ERROR] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES]`,
        { extra: error }
      );
    }

    // Second PATCH request
    try {
      const standingsResponse = await axios.patch(event.standingsUrl, null, {
        headers: { 
          'X-Internal-Token': INTERNAL_TOKEN,
        },
      });

      Sentry.captureMessage(
        `[LOG] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [STANDINGS] - [${envTarget}]`,
        {
          level: 'log',
          extra: standingsResponse.data,
        }
      );
    } catch (error) {
      Sentry.captureException(
        `[ERROR] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [STANDINGS] - [${envTarget}]`,
        { extra: error }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify('LAMBDA: SUCCEEDED'),
    };
  } catch (error) {
    Sentry.captureException(
      `[ERROR] - [LAMBDA] - [SCORES AND STANDINGS] - [${envTarget}]`,
      {
        extra: {
          message: error.message,
          stack: error.stack,
        },
      }
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'LAMBDA: FAILED',
        error: error.message,
        stack: error.stack,
      }),
    };
  }
});
