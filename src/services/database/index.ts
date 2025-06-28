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
  } catch (err) {
    console.error(
      `----------------------------------------------------
❌ Database connection failed: \nif you are running this on your local machine, please check if the 'bestshot_db' container is running. If you are running this on cloud run, please check if the database is running.

Error: ${err}
----------------------------------------------------`
    );

    process.exit(1);
  }
}

if (env.DB_STRING_CONNECTION) {
  const client = postgres(env.DB_STRING_CONNECTION, {
    prepare: false,
  });
  db = drizzle(client, { schema });
  verifyConnection(client); // Run the connection check
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
