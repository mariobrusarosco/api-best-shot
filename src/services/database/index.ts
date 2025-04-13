import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

const getConnectionString = () => {
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'demo') {
    return env.DB_STRING_CONNECTION;
  }
  
  return env.DB_STRING_CONNECTION_LOCAL;
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
