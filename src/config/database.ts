import { z } from 'zod';

const NODE_ENV = process.env.NODE_ENV || 'development';

const databaseEnvSchema = z.object({
  DB_HOST: z.string({
    required_error: 'DB_HOST is required in environment variables',
  }),
  DB_PORT: z.coerce.number({
    required_error: 'DB_PORT is required in environment variables',
  }),
  DB_USER: z.string({
    required_error: 'DB_USER is required in environment variables',
  }),
  DB_PASSWORD: z.string({
    required_error: 'DB_PASSWORD is required in environment variables',
  }),
  DB_NAME: z.string({
    required_error: 'DB_NAME is required in environment variables',
  }),
  DB_SSL: z.coerce.boolean().default(NODE_ENV !== 'development'), // SSL by default except in development
});

type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

function validateDatabaseEnv(): DatabaseEnv {
  const result = databaseEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      `❌ Invalid database environment variables for ${NODE_ENV} environment:`,
      result.error.format()
    );
    throw new Error('Invalid database configuration');
  }

  return result.data;
}

function buildConnectionString(config: DatabaseEnv): string {
  const sslParam = config.DB_SSL ? '?sslmode=require' : '';
  return `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}${sslParam}`;
}

export function getDatabaseConfig() {
  const config = validateDatabaseEnv();
  return {
    connectionString: buildConnectionString(config),
    ...config,
  };
}
