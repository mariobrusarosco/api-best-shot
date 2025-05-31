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

  // --- BEGIN DEBUGGING ---
  if (!connectionString || connectionString.trim() === '') {
    console.error(
      '❌ DEBUG: DB_STRING_CONNECTION is empty or undefined in initializeDbClient.'
    );
    // Optionally, throw an immediate error to make it clear
    // throw new Error('DEBUG: DB_STRING_CONNECTION is empty or undefined.');
  } else {
    console.log(
      `ℹ️ DEBUG: initializeDbClient: Received connection string (length: ${connectionString.length}). Starts with 'postgresql://': ${connectionString.startsWith('postgresql://')}`
    );
    try {
      new URL(connectionString); // Try parsing it directly
      console.log(
        'ℹ️ DEBUG: initializeDbClient: Connection string successfully parsed by new URL() before passing to postgres lib.'
      );
    } catch (parsingError: any) {
      console.error(
        '❌ DEBUG: initializeDbClient: Failed to parse connection string with new URL() before passing to postgres lib. Error:',
        parsingError.message
      );
      // Log the input if it's different or if it's the '***' masking to confirm
      if (parsingError.input) {
        console.error(
          '   DEBUG: Parsing error input was (masked if sensitive by URL parser):',
          parsingError.input === connectionString
            ? '(same as connectionString)'
            : parsingError.input
        );
      }
      // Optionally, re-throw to stop before postgres() tries, to isolate the error source
      // throw new Error(`DEBUG: Failed to parse DB_STRING_CONNECTION internally: ${parsingError.message}`);
    }
  }
  // --- END DEBUGGING ---

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
