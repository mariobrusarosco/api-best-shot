import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_PATH || '.env' });

function getDbUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Use environment-specific connection strings
  if (nodeEnv === 'production') {
    return process.env.DB_STRING_CONNECTION_PRODUCTION!;
  }

  if (nodeEnv === 'demo') {
    return process.env.DB_STRING_CONNECTION_DEMO!;
  }

  // Local development - build from components
  return `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}`;
}

export const dbUrl = getDbUrl();
