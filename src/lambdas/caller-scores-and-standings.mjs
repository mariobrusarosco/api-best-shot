import * as Sentry from '@sentry/aws-serverless';
import '/opt/nodejs/instrument.mjs';

import axios from 'axios';

export const handler = Sentry.wrapHandler(async event => {
  const targetEnv = event.targetEnv || 'demo';
  const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
  
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
        `[LOG] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES] - [${targetEnv}]`,
        {
          level: 'log',
          extra: { 
            tournamentId: event.tournamentId,
            roundSlug: event.roundSlug,
            response: roundResponse.data 
          },
        }
      );
    } catch (error) {
      console.error(`❌ [${targetEnv}] Failed to update match scores:`, error.message);
      Sentry.captureException(
        `[ERROR] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [SCORES] - [${targetEnv}]`,
        { 
          extra: { 
            tournamentId: event.tournamentId,
            roundSlug: event.roundSlug,
            error: error.message 
          } 
        }
      );
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
        `[LOG] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [STANDINGS] - [${targetEnv}]`,
        {
          level: 'log',
          extra: { 
            tournamentId: event.tournamentId,
            response: standingsResponse.data 
          },
        }
      );
    } catch (error) {
      console.error(`❌ [${targetEnv}] Failed to update standings:`, error.message);
      Sentry.captureException(
        `[ERROR] - [LAMBDA] - [CALLER SCORES AND STANDINGS] - [STANDINGS] - [${targetEnv}]`,
        { 
          extra: { 
            tournamentId: event.tournamentId,
            error: error.message 
          } 
        }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify('LAMBDA: SUCCEEDED'),
    };
  } catch (error) {
    Sentry.captureException(
      `[ERROR] - [LAMBDA] - [SCORES AND STANDINGS] - [${targetEnv}]`,
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
