import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
  const startTime = Date.now();
  
  console.log(`---------------------------------START [${targetEnv}]----`);

  try {
    // Update match scores with tournament and round info
    try {
      const roundResponse = await axios.patch(event.roundUrl, {
        tournamentId: event.tournamentId,
        roundSlug: event.roundSlug,
      }, {
        headers: { 
          'X-Internal-Token': INTERNAL_TOKEN,
        },
      });
      
      console.log(`✅ [${targetEnv}] Updated match scores for tournament ${event.tournamentId}, round ${event.roundSlug}`);
      
      Sentry.captureMessage(
        `🔄 LAMBDA | UPDATE MATCHES | success | ${targetEnv}`,
        {
          level: 'info',
          tags: {
            domain: 'DATA_PROVIDER',
            component: 'LAMBDA',
            operation: 'UPDATE',
            resource: 'MATCHES',
            environment: targetEnv,
            status: 'success',
            function: 'caller-scores-and-standings'
          },
          extra: {
            timestamp: new Date().toISOString(),
            tournamentId: event.tournamentId,
            roundSlug: event.roundSlug,
            apiResponse: roundResponse.data,
            duration: `${Date.now() - startTime}ms`
          },
        }
      );
    } catch (error) {
      console.error(`❌ [${targetEnv}] Failed to update match scores:`, error.message);
      Sentry.captureException(error, {
        tags: {
          domain: 'DATA_PROVIDER',
          component: 'LAMBDA',
          operation: 'UPDATE',
          resource: 'MATCHES',
          environment: targetEnv,
          status: 'error',
          function: 'caller-scores-and-standings'
        },
        extra: {
          timestamp: new Date().toISOString(),
          tournamentId: event.tournamentId,
          roundSlug: event.roundSlug,
          url: event.roundUrl
        }
      });
    }

    // Update tournament standings
    try {
      const standingsResponse = await axios.patch(event.standingsUrl, {
        tournamentId: event.tournamentId,
      }, {
        headers: { 
          'X-Internal-Token': INTERNAL_TOKEN,
        },
      });

      console.log(`✅ [${targetEnv}] Updated standings for tournament ${event.tournamentId}`);

      Sentry.captureMessage(
        `🔄 LAMBDA | UPDATE STANDINGS | success | ${targetEnv}`,
        {
          level: 'info',
          tags: {
            domain: 'DATA_PROVIDER',
            component: 'LAMBDA',
            operation: 'UPDATE',
            resource: 'STANDINGS',
            environment: targetEnv,
            status: 'success',
            function: 'caller-scores-and-standings'
          },
          extra: {
            timestamp: new Date().toISOString(),
            tournamentId: event.tournamentId,
            apiResponse: standingsResponse.data,
            duration: `${Date.now() - startTime}ms`
          },
        }
      );
    } catch (error) {
      console.error(`❌ [${targetEnv}] Failed to update standings:`, error.message);
      Sentry.captureException(error, {
        tags: {
          domain: 'DATA_PROVIDER',
          component: 'LAMBDA',
          operation: 'UPDATE',
          resource: 'STANDINGS',
          environment: targetEnv,
          status: 'error',
          function: 'caller-scores-and-standings'
        },
        extra: {
          timestamp: new Date().toISOString(),
          tournamentId: event.tournamentId,
          url: event.standingsUrl
        }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify('LAMBDA: SUCCEEDED'),
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        domain: 'DATA_PROVIDER',
        component: 'LAMBDA',
        operation: 'UPDATE',
        resource: 'MATCHES',
        environment: targetEnv,
        status: 'error',
        function: 'caller-scores-and-standings'
      },
      extra: {
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`,
        tournamentId: event.tournamentId,
        roundSlug: event.roundSlug
      },
    });

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
