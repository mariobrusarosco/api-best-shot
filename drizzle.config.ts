import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/services/database/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_CREDENTIALS!
  },
  verbose: true
})
