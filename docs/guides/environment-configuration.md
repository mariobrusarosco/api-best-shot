# Environment Configuration

## Overview

Best Shot API uses a type-safe environment configuration system built with Zod. This system provides runtime validation, TypeScript types, and centralized configuration management.

## Key Features

- 🔒 **Type Safety**: Full TypeScript support with autocomplete
- ✅ **Runtime Validation**: Validates all environment variables at startup
- 📦 **Centralized Configuration**: Single source of truth
- 🚀 **Developer Experience**: Clear error messages and IDE support
- 🛡️ **Production Safety**: Fail-fast if environment is misconfigured

## Environment Variables

### Required Variables

```typescript
// Database Configuration
DB_USER; // Database username
DB_PASSWORD; // Database password
DB_NAME; // Database name
DB_HOST; // Database host
DB_PORT; // Database port (number)

// Application
NODE_ENV; // 'development' | 'demo' | 'production'
PORT; // Application port (default: 9090)

// Security
JWT_SECRET; // Secret for JWT signing
MEMBER_PUBLIC_ID_COOKIE; // Cookie name for member ID
ACCESS_CONTROL_ALLOW_ORIGIN; // CORS origin

// AWS Configuration
AWS_ACCESS_KEY_ID; // AWS access key
AWS_SECRET_ACCESS_KEY; // AWS secret key
AWS_BUCKET_NAME; // S3 bucket name
AWS_CLOUDFRONT_URL; // AWS CloudFront domain for serving assets

// Monitoring
SENTRY_DSN; // Sentry Data Source Name
```

### Environment Files

The project supports different environment files:

- `.env` - Development environment (default)
- `.env.demo` - Demo environment
- `.env.production` - Production environment

## Usage

### 1. In Application Code

```typescript
import { env } from './config/env';

// Use typed environment variables
const port = env.PORT;
const isDevelopment = env.NODE_ENV === 'development';
```

### 2. Type Support

```typescript
import type { Env } from './config/env';

// Use environment type in your functions
function configureDatabase(config: Pick<Env, 'DB_HOST' | 'DB_PORT'>) {
  // TypeScript knows the exact types
  const { DB_HOST, DB_PORT } = config;
}
```

### 3. Environment Selection

```bash
# Development (default)
yarn dev

# Demo environment
yarn dev-demo

# Production environment
yarn dev-prod
```

## Validation

Environment variables are validated at runtime using Zod:

1. **Type Validation**: Ensures variables are of correct type
2. **Enumeration Checks**: `NODE_ENV` must be one of: 'development', 'demo', 'production'
3. **Transformations**: String to number conversion for ports
4. **Default Values**: Provides defaults for optional variables

## Error Handling

If validation fails, the application will:

1. Log detailed error messages
2. Show which variables are missing or invalid
3. Provide setup instructions
4. Exit with status code 1

Example error:

```
❌ Invalid environment variables:
DB_PASSWORD: Required
AWS_ACCESS_KEY_ID: Required

💡 Tip: Run 'docker compose --profile setup up env-setup' to generate a default .env file
```

## Best Practices

1. **Always Use Types**

   ```typescript
   // ✅ Good
   import { env } from './config/env';
   const port = env.PORT;

   // ❌ Bad
   const port = process.env.PORT;
   ```

2. **Environment-Specific Logic**

   ```typescript
   // ✅ Good
   if (env.NODE_ENV === 'development') {
     // Development-only code
   }

   // ❌ Bad
   if (process.env.NODE_ENV === 'development') {
     // Unsafe, no type checking
   }
   ```

3. **Adding New Variables**
   1. Add to `envSchema` in `src/config/env.ts`
   2. Add to `.env.example` if it exists
   3. Update documentation
   4. Update environment setup scripts

## Troubleshooting

### Common Issues

1. **Missing Environment File**

   ```bash
   # Generate default .env
   docker compose --profile setup up env-setup
   ```

2. **Invalid Environment**

   ```bash
   # Verify current environment
   echo $NODE_ENV

   # Check which .env file is being used
   ls -la .env*
   ```

3. **Type Errors**
   ```typescript
   // Ensure you're importing from config/env
   import { env } from './config/env';
   ```

### Development Workflow

1. **Local Development**

   - Copy `.env.example` to `.env`
   - Fill in required values
   - Run application

2. **Adding New Variables**

   ```typescript
   // In src/config/env.ts
   const envSchema = z.object({
     // ... existing variables
     NEW_VARIABLE: z.string(),
   });
   ```

3. **Environment-Specific Values**
   - Add to appropriate `.env` file
   - Update documentation
   - Inform team members

## Security Considerations

1. **Never commit .env files**

   - Keep `.env` in `.gitignore`
   - Use `.env.example` for templates

2. **Sensitive Variables**

   - Use appropriate security measures
   - Consider using secrets management
   - Rotate sensitive values regularly

3. **Production Security**
   - Use different values for each environment
   - Restrict access to production variables
   - Log access to sensitive configurations
