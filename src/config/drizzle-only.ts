import dotenv from 'dotenv';

// Load environment variables
const envPath = process.env.ENV_PATH || '.env';
dotenv.config({ path: envPath });

// Simple database connection for drizzle-kit only
function getDatabaseUrl(): string {
  // Use full connection string if available
  if (process.env.DB_STRING_CONNECTION) {
    return process.env.DB_STRING_CONNECTION;
  }

  // Build from components
  const { DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT = '5432' } = process.env;

  if (!DB_USER || !DB_PASSWORD || !DB_NAME || !DB_HOST) {
    console.error('❌ Database configuration missing');
    console.error('Set DB_STRING_CONNECTION or DB_USER, DB_PASSWORD, DB_NAME, DB_HOST');
    process.exit(1);
  }

  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

export const dbUrl = getDatabaseUrl();
