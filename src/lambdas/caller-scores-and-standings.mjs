import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';
import { metadata } from '/opt/nodejs/metadata.mjs';

export const handler = Sentry.wrapHandler(async event => {
  const envTarget = event.envTarget || 'demo';
  const COOKIE_TOKEN_NAME = metadata[envTarget].TOKEN_NAME;
  const INTERNAL_TOKEN_NAME = metadata[envTarget].INTERNAL_TOKEN_NAME;
  const COOKIE = process.env[COOKIE_TOKEN_NAME];
  const INTERNAL_TOKEN = process.env[INTERNAL_TOKEN_NAME];

  try {
    try {
      const roundResponse = await axios.patch(event.roundUrl, null, {
        headers: { 
          Cookie: COOKIE,
          'X-Internal-Token': INTERNAL_TOKEN,
        },
      });
      Sentry.captureMessage(
        `[LOG] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES] - [${envTarget}]`,
        {
          level: 'log',
          extra: roundResponse.data,
        }
      );
    } catch (error) {
      Sentry.captureException(
        `[ERROR] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES] - [${envTarget}]`,
        { extra: error }
      );
    }

    // Second PATCH request
    try {
      const standingsResponse = await axios.patch(event.standingsUrl, null, {
        headers: { 
          Cookie: COOKIE,
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
