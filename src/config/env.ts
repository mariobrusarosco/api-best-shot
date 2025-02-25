import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envPath = process.env.ENV_PATH || '.env';
dotenv.config({ path: envPath });

// Define environment schema with Zod
const envSchema = z.object({
  // Database
  DB_USER: z.string().min(1, "Database username is required"),
  DB_PASSWORD: z.string().min(1, "Database password is required"),
  DB_NAME: z.string().min(1, "Database name is required"),
  DB_HOST: z.string().min(1, "Database host is required"),
  DB_PORT: z.string().transform((val) => {
    const port = parseInt(val, 10);
    if (isNaN(port)) throw new Error("Port must be a number");
    return port;
  }),
  
  // App
  NODE_ENV: z.enum(['development', 'demo', 'production']).default('development'),
  PORT: z.string().transform((val) => {
    const port = parseInt(val, 10);
    if (isNaN(port)) throw new Error("Port must be a number");
    return port;
  }).default('9090'),
  API_VERSION: z.string().optional(),
  
  // Security
  JWT_SECRET: z.string().min(1, "JWT secret is required"),
  MEMBER_PUBLIC_ID_COOKIE: z.string().min(1, "Member public ID cookie name is required"),
  ACCESS_CONTROL_ALLOW_ORIGIN: z.string().min(1, "CORS origin is required"),
  
  // AWS
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS access key ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS secret access key is required"),
  AWS_BUCKET_NAME: z.string().min(1, "AWS bucket name is required"),
  
  // Monitoring
  SENTRY_DSN: z.string().min(1, "Sentry DSN is required"),
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
    console.error('  1. Run \'docker compose --profile setup up env-setup\' to generate a default .env file');
    console.error('  2. Check if all required variables are set in your .env file');
    console.error('  3. Verify the values match the expected types\n');
    
    process.exit(1);
  }
}

// Export validated environment configuration
export const env = validateEnv();

// Export type for use in other files
export type Env = z.infer<typeof envSchema>; 