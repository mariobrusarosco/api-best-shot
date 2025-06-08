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
    // Force IPv4 for better compatibility
    options: `-c prefer_hostaddr=true -c inet_client_addr_family=ipv4`,
  },
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
