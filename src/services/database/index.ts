import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DB_CREDENTIALS as string;

const client = postgres(connectionString, {
  prepare: false,
});
const db = drizzle(client, { schema });

export default db;
