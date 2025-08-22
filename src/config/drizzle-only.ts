import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_PATH || '.env' });

/**
 * Environment-aware database connection resolver
 * Automatically selects the correct database connection based on NODE_ENV
 */
function resolveDbConnection(): string {
  const nodeEnv = process.env.NODE_ENV;

  // Priority 1: Direct DB_STRING_CONNECTION (for local development)
  if (process.env.DB_STRING_CONNECTION) {
    return process.env.DB_STRING_CONNECTION;
  }

  // Priority 2: Environment-specific connections (for CI/CD and Cloud Run)
  switch (nodeEnv) {
    case 'demo':
      if (process.env.DB_STRING_CONNECTION_DEMO) {
        return process.env.DB_STRING_CONNECTION_DEMO;
      }
      break;

    case 'staging':
      if (process.env.DB_STRING_CONNECTION_STAGING) {
        return process.env.DB_STRING_CONNECTION_STAGING;
      }
      break;

    case 'production':
      if (process.env.DB_STRING_CONNECTION_PRODUCTION) {
        return process.env.DB_STRING_CONNECTION_PRODUCTION;
      }
      break;
  }

  // Priority 3: Fallback to component-based connection (for local Docker)
  if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_HOST && process.env.DB_NAME) {
    return `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}`;
  }

  // Priority 4: Final fallback with informative error
  const availableConnections = [
    process.env.DB_STRING_CONNECTION && 'DB_STRING_CONNECTION',
    process.env.DB_STRING_CONNECTION_DEMO && 'DB_STRING_CONNECTION_DEMO',
    process.env.DB_STRING_CONNECTION_STAGING && 'DB_STRING_CONNECTION_STAGING',
    process.env.DB_STRING_CONNECTION_PRODUCTION && 'DB_STRING_CONNECTION_PRODUCTION',
  ].filter(Boolean);

  console.warn(`⚠️ Database connection resolution failed:
    - NODE_ENV: ${nodeEnv || 'undefined'}
    - Available connections: ${availableConnections.length > 0 ? availableConnections.join(', ') : 'none'}
    - Using placeholder connection (will likely fail)
  `);

  return 'postgresql://placeholder:placeholder@placeholder:5432/placeholder';
}

// Export the resolved database URL
export const dbUrl = resolveDbConnection();
