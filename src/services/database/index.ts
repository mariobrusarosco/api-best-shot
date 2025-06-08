import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/config/env';

const connectionString = `postgresql://${env.DB_USER}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
console.log({ connectionString });

const client = postgres(connectionString, {
  prepare: false,
});

const db = drizzle(client, { schema });

export default db;
