import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

// Handle optional database connection for Cloud Run testing
let db: any;

if (env.DB_STRING_CONNECTION) {
  const client = postgres(env.DB_STRING_CONNECTION, {
    prepare: false,
  });
  db = drizzle(client, { schema });
  console.log('✅ Database connected successfully');
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
