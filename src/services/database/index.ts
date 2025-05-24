import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

// Get the database connection string
const getConnectionString = () => {
  // Get the connection string from environment
  let connectionString = env.DB_STRING_CONNECTION;

  // In development environment, handle Docker vs local connection
  if (env.NODE_ENV === 'development') {
    // If running locally (not in Docker), replace 'postgres' hostname with 'localhost'
    // and ensure correct port mapping
    if (connectionString.includes('@postgres:')) {
      try {
        const url = new URL(connectionString);
        // Check if we're trying to connect from host to container
        if (url.hostname === 'postgres') {
          url.hostname = 'localhost';
          url.port = env.DB_PORT.toString();
          connectionString = url.toString();
          console.log(
            `🔄 Adjusted connection string for local development: ${connectionString}`
          );
        }
      } catch (e) {
        console.warn('⚠️ Could not parse database connection string', e);
      }
    }
  }

  return connectionString;
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
