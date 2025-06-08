import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/config/env';

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 0,
  connect_timeout: 60,
  keep_alive: 60, // Keep alive every 60 seconds
});

const db = drizzle(client, { schema });

export default db;
