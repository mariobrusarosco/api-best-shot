import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'demo') {
  Sentry.init({
    dsn: 'https://742d27f4dbd81801a3db8052d70c90c5@o4506356341276672.ingest.us.sentry.io/4508559357902848',
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}
