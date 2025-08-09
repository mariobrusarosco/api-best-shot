import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

  try {
    const newKnockoutRounds = await axios.post(event.knockoutsUpdateUrl, null, {
      headers: {
        'X-Internal-Token': INTERNAL_TOKEN,
      },
    });

    Sentry.captureMessage(
      `[${targetEnv}], [LOG] - [LAMBDA] - [CALLER NEW ROUNDS AND MATCHES]`,
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
      `[${targetEnv}], [ERROR] - [LAMBDA] - [CALLER NEW ROUNDS AND MATCHES]`,
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
