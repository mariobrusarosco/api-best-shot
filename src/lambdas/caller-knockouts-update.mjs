import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';
import { metadata } from './metadata.mjs';

export const handler = Sentry.wrapHandler(async event => {
  const envTarget = event.envTarget || 'demo';
  const COOKIE_TOKEN_NAME = metadata[envTarget].TOKEN_NAME;
  const COOKIE = process.env[COOKIE_TOKEN_NAME];

  try {
    const newKnockoutRounds = await axios.post(event.knockoutsUpdateUrl, null, {
      headers: {
        Cookie: COOKIE,
      },
    });

    Sentry.captureMessage(
      `[${envTarget}], [LOG] - [LAMBDA] - [CALLER NEW ROUNDS AND MATCHES]`,
      {
        level: 'log',
        extra: { newKnockoutRounds },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify('CALLER: SUCCEEDED'),
    };
  } catch (error) {
    Sentry.captureException(
      `[${envTarget}], [ERROR] - [LAMBDA] - [CALLER NEW ROUNDS AND MATCHES]`,
      {
        extra: { error },
      }
    );

    return {
      statusCode: 500,
      body: JSON.stringify('LAMBDA: FAILED:'),
    };
  }
});
