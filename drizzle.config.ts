import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env';

export default defineConfig({
  schema: './src/services/database/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DB_STRING_CONNECTION || 'postgresql://localhost:5432/test',
  },
  verbose: true,
});
