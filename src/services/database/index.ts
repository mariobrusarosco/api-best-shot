import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

// Handle optional database connection for Cloud Run testing
let db: any;

async function verifyConnection(client: any) {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.error(
      `----------------------------------------------------
❌ Database connection failed: \nif you are running this on your local machine, please check if the 'bestshot_db' container is running. If you are running this on cloud run, please check if the database is running.

Error: ${err}
----------------------------------------------------`
    );

    // Don't exit in production/demo environments - let the app run without DB
    if (env.NODE_ENV === 'development') {
      process.exit(1);
    } else {
      console.warn(
        '⚠️ Continuing without database connection in non-development environment'
      );
      return false;
    }
  }
}

if (env.DB_STRING_CONNECTION) {
  const client = postgres(env.DB_STRING_CONNECTION, {
    prepare: false,
  });
  db = drizzle(client, { schema });

  // Verify connection but don't block startup in production/demo
  verifyConnection(client).then(connected => {
    if (!connected && env.NODE_ENV !== 'development') {
      console.warn('⚠️ Database verification failed - some features may not work');
    }
  });
} else {
  console.warn('⚠️ Database connection not configured - running in test mode');
  // Create a mock database object for testing
  db = new Proxy(
    {},
    {
      get() {
        throw new Error('Database not configured - please set DB_STRING_CONNECTION');
      },
    }
  );
}

export default db;
