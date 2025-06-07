import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

const pgOptions = {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
};

/**
 * Factory to create a Drizzle client. Use for scripts or tests if needed.
 */
export function getDrizzleClient() {
  try {
    console.log(`🔌 Connecting to database in ${env.NODE_ENV} environment...`);
    const client = postgres({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.NODE_ENV !== 'development',
      ...pgOptions,
    });
    return drizzle(client, { schema });
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Main application Drizzle client (singleton for app use)
 */
const db = getDrizzleClient();
export default db;
