import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/services/database/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5497', 10),
    user: process.env.DB_USER || 'dev_user',
    password: process.env.DB_PASSWORD || 'dev_pass',
    database: process.env.DB_NAME || 'bestshot_dev',
    ssl: process.env.NODE_ENV !== 'development',
  },
});
