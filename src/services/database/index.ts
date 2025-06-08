import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

const pgOptions = {
  prepare: false,
  max: 1, // Limit to single connection
  idle_timeout: 0, // Disable idle timeout
  connect_timeout: 30, // Increase timeout
  keepAlive: true, // Keep connection alive
  connection: {
    application_name: 'best-shot-api',
    keepalive: true,
    tcp_keepalives_idle: 60,
    tcp_keepalives_interval: 10,
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
      ssl:
        env.NODE_ENV !== 'development'
          ? {
              rejectUnauthorized: true,
              mode: 'require',
            }
          : false,
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
