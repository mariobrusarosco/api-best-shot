import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_PATH || '.env' });

// Cloud Build doesn't have environment variables during migration
// Use a default that works for Cloud Build + local development
export const dbUrl =
  process.env.DB_STRING_CONNECTION ||
  process.env.DB_STRING_CONNECTION_DEMO ||
  process.env.DB_STRING_CONNECTION_PRODUCTION ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}` ||
  'postgresql://placeholder:placeholder@placeholder:5432/placeholder';
