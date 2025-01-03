import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';
import { metadata } from './metadata.mjs';

export const handler = Sentry.wrapHandler(async (event, context) => {
  const envTarget = event.envTarget || 'demo';
  const ENDPOINT = metadata[envTarget].ENDPOINT;
  const COOKIE_TOKEN_NAME = metadata[envTarget].TOKEN_NAME;
  const COOKIE = process.env[COOKIE_TOKEN_NAME];

  try {
    const schedulerResponse = await axios.post(ENDPOINT, null, {
      headers: { Cookie: COOKIE },
    });

    Sentry.captureMessage(`[LOG] - [LAMBDA] - [CALLER DAILY ROUTINE] [${envTarget}]`, {
      level: 'log',
      extra: { schedulerResponse },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(schedulerResponse),
    };
  } catch (error) {
    Sentry.captureException(
      `[ERROR] - [LAMBDA] - [CALLER DAILY ROUTINE] [${envTarget}]`,
      error
    );
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
});
