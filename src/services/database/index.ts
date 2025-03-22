import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

// Use the local connection string since we're running locally
const client = postgres(env.DB_STRING_CONNECTION_LOCAL, {
  prepare: false,
});

const db = drizzle(client, { schema });

export default db;
