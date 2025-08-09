import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '../../config/env';

type DatabaseType = PostgresJsDatabase<typeof schema>;

// Handle optional database connection for Cloud Run testing
let db: DatabaseType;

async function verifyConnection(client: postgres.Sql): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (err: unknown) {
    console.error(
      `----------------------------------------------------
❌ Database connection failed: \nif you are running this on your local machine, please check if the 'bestshot_db' container is running. If you are running this on cloud run, please check if the database is running.

Error: ${err instanceof Error ? err.message : String(err)}
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
      get(): never {
        throw new Error('Database not configured - please set DB_STRING_CONNECTION');
      },
    }
  ) as DatabaseType;
}

export default db;
