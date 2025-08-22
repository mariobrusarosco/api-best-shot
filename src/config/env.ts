import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables based on NODE_ENV
const envPath = process.env.ENV_PATH || '.env';
dotenv.config({ path: envPath });

// Define environment schema with Zod
const envSchema = z.object({
  // Database - optional for Cloud Run testing
  DB_STRING_CONNECTION: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z
    .string()
    .transform(val => {
      if (!val) return 5432;
      const port = parseInt(val, 10);
      if (isNaN(port)) throw new Error('Port must be a number');
      return port;
    })
    .optional(),

  // App
  NODE_ENV: z.enum(['development', 'demo', 'staging', 'production']).default('development'),
  PORT: z
    .string()
    .transform(val => {
      const port = parseInt(val, 10);
      if (isNaN(port)) throw new Error('Port must be a number');
      return port;
    })
    .default('9090'),
  API_VERSION: z.string().default('/v2'),
  API_DOMAIN: z.string().min(1, 'API domain is required'),

  // Security
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  MEMBER_PUBLIC_ID_COOKIE: z.string().min(1, 'Member public ID cookie name is required'),
  ACCESS_CONTROL_ALLOW_ORIGIN: z.string().min(1, 'CORS origin is required'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS access key ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS secret access key is required'),
  AWS_ACCOUNT_ID: z.string().min(1, 'AWS account ID is required'),
  AWS_BUCKET_NAME: z.string().min(1, 'AWS bucket name is required'),
  AWS_CLOUDFRONT_URL: z.string().min(1, 'AWS CloudFront URL is required'),
  AWS_REGION: z.string().default('us-east-1'),

  // AWS Lambda Environment Variables (for Lambda execution)
  DATA_PROVIDER_COOKIE_PRODUCTION: z.string().optional(),
  DATA_PROVIDER_COOKIE_DEMO: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().min(1, 'Sentry DSN is required'),

  // Internal Service Operations
  INTERNAL_SERVICE_TOKEN: z.string().min(1, 'Internal service token is required'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('\n❌ Environment Validation Failed\n');

    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        const path = err.path.join('.');
        const message = err.message;
        console.error(`  - ${path}: ${message}`);
      });
    }

    console.error('\n💡 Tips:');
    console.error("  1. Run 'docker compose --profile setup up env-setup' to generate a default .env file");
    console.error('  2. Check if all required variables are set in your .env file');
    console.error('  3. Verify the values match the expected types\n');

    process.exit(1);
  }
}

// Export validated environment configuration
export const env = validateEnv();

// Export type for use in other files
export type Env = z.infer<typeof envSchema>;
