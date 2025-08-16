import { defineConfig } from 'drizzle-kit';
import { dbUrl } from './src/config/drizzle-only';

export default defineConfig({
  schema: './src/services/database/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
});
