import * as Sentry from '@sentry/aws-serverless';
import axios from 'axios';
import { metadata } from './metadata.mjs';
import '/opt/nodejs/instrument.mjs';

export const handler = Sentry.wrapHandler(async (event, context) => {
  const envTarget = event.envTarget || 'demo';
  const ENDPOINT = metadata[envTarget].endpoint;
  const COOKIE = metadata[envTarget].cookie;

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
