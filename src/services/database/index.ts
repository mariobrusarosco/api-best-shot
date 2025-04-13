import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

// Choose the appropriate connection string based on environment
const getConnectionString = () => {
  // Use Docker connection string when in Docker/production environments
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'demo') {
    return env.DB_STRING_CONNECTION;
  }
  
  // Use local connection string for development
  return env.DB_STRING_CONNECTION_LOCAL;
};

// Configuration options for postgres client
const pgOptions = {
  prepare: false,
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Max seconds a client can be idle before being closed
  connect_timeout: 10, // Max seconds to wait for connection
};

// Initialize database client
const initializeDbClient = () => {
  const connectionString = getConnectionString();
  
  try {
    console.log(`🔌 Connecting to database in ${env.NODE_ENV} environment...`);
    return postgres(connectionString, pgOptions);
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
};

const client = initializeDbClient();
const db = drizzle(client, { schema });

export default db;
