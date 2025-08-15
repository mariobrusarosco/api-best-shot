import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
  const startTime = Date.now();

  console.log(`---------------------------------START [${targetEnv}]----`);

  try {
    const newKnockoutRounds = await axios.post(event.knockoutsUpdateUrl, null, {
      headers: {
        'X-Internal-Token': INTERNAL_TOKEN,
      },
    });

    console.log(`✅ [${targetEnv}] Created new knockout rounds and matches`);

    Sentry.captureMessage(
      `🔄 LAMBDA | CREATE ROUNDS | success | ${targetEnv}`,
      {
        level: 'info',
        tags: {
          domain: 'DATA_PROVIDER',
          component: 'LAMBDA',
          operation: 'CREATE',
          resource: 'ROUNDS',
          environment: targetEnv,
          status: 'success',
          function: 'caller-knockouts-update'
        },
        extra: {
          timestamp: new Date().toISOString(),
          apiResponse: newKnockoutRounds.data,
          duration: `${Date.now() - startTime}ms`,
          endpoint: event.knockoutsUpdateUrl
        },
      }
    );

    console.log(`[END] - Knockout rounds update completed for: ${targetEnv}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Knockout rounds update completed successfully',
        environment: targetEnv,
        newRounds: newKnockoutRounds.data
      }),
    };
  } catch (error) {
    console.error(`❌ [${targetEnv}] Failed to create knockout rounds:`, error.message);

    Sentry.captureException(error, {
      tags: {
        domain: 'DATA_PROVIDER',
        component: 'LAMBDA',
        operation: 'CREATE',
        resource: 'ROUNDS',
        environment: targetEnv,
        status: 'error',
        function: 'caller-knockouts-update'
      },
      extra: {
        timestamp: new Date().toISOString(),
        endpoint: event.knockoutsUpdateUrl,
        duration: `${Date.now() - startTime}ms`
      }
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Knockout rounds update failed',
        message: error.message,
        environment: targetEnv
      }),
    };
  }
});
