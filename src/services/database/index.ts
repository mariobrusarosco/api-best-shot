import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

const pgOptions = {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    application_name: 'best-shot-api',
  },
};

/**
 * Factory to create a Drizzle client. Use for scripts or tests if needed.
 */
export function getDrizzleClient() {
  try {
    console.log(`🔌 Connecting to database in ${env.NODE_ENV} environment...`);
    // Build connection string with URL-encoded components
    const connectionString = `postgres://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
    const client = postgres(connectionString, {
      ssl: env.NODE_ENV !== 'development',
      ...pgOptions,
      connect_timeout: 10,
    });
    const drizzleClient = drizzle(client, { schema });
    console.log('✅ Database connection established successfully!');
    return drizzleClient;
  } catch (error) {
    console.error('💥 Database connection failed:', error);
    throw error;
  }
}

/**
 * Main application Drizzle client (singleton for app use)
 */
const db = getDrizzleClient();
export default db;
