import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../../config/env';

const client = postgres(env.DB_STRING_CONNECTION, {
  prepare: false,
});

const db = drizzle(client, { schema });

export default db;
