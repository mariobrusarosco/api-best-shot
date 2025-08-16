# Environment Management Guide

Complete guide to environment variable configuration and flow across development, CI/CD, and production contexts.

## Overview

Best Shot API uses a **type-safe environment configuration system** with context-aware validation:

- 🔒 **Type Safety**: Full TypeScript support with runtime validation
- ✅ **Context-Aware**: Different validation for app vs migrations
- 📦 **Centralized**: Single source of truth with clear boundaries
- 🛡️ **Production Safe**: Fail-fast validation with helpful errors

## Architecture

### Dual Configuration System

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Variables                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Application Context          Database Context              │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ src/config/     │          │ src/config/     │          │
│  │ env.ts          │          │ drizzle-only.ts │          │
│  │                 │          │                 │          │
│  │ • ALL env vars  │          │ • DB vars only  │          │
│  │ • Full validation│          │ • Minimal check │          │
│  │ • App runtime   │          │ • Migrations    │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Files

#### Application Environment (`src/config/env.ts`)

- **Purpose**: Full application runtime configuration
- **Validates**: ALL environment variables
- **Used by**: Application startup (`src/index.ts`)
- **Requirements**: Complete environment setup

#### Database-Only Environment (`src/config/drizzle-only.ts`)

- **Purpose**: Database migrations only
- **Validates**: Database connection variables only
- **Used by**: Drizzle configuration (`drizzle.config.ts`)
- **Requirements**: Database credentials only

## Environment Variables

### Type-Safe Configuration

All environment variables are validated with Zod for type safety:

```typescript
import { env } from './config/env';

// Fully typed access
const port = env.PORT; // number
const isProduction = env.NODE_ENV === 'production'; // boolean
const dbUrl = env.DB_STRING_CONNECTION; // string
```

### Variable Categories

#### Database Variables

```bash
# Connection string (preferred for CI/Production)
DB_STRING_CONNECTION=postgresql://user:pass@host:5432/dbname

# Individual components (used in development)
DB_USER=dev_user
DB_PASSWORD=dev_pass
DB_NAME=bestshot_dev
DB_HOST=postgres
DB_PORT=5432
```

#### Application Variables

```bash
# Core application
NODE_ENV=development  # 'development' | 'demo' | 'production'
PORT=9090            # Application port (number)
API_VERSION=/v2      # API version prefix
API_DOMAIN=http://localhost:9090

# Security (required)
JWT_SECRET=your-jwt-secret
MEMBER_PUBLIC_ID_COOKIE=best-shot-auth
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:5173
INTERNAL_SERVICE_TOKEN=your-internal-token

# AWS Services (required)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret
AWS_ACCOUNT_ID=123456789
AWS_BUCKET_NAME=your-bucket
AWS_CLOUDFRONT_URL=your-cloudfront-url
AWS_REGION=us-east-1

# Monitoring (required)
SENTRY_DSN=https://your-sentry-dsn

# Lambda Environment (optional)
DATA_PROVIDER_COOKIE_PRODUCTION=cookie-value
DATA_PROVIDER_COOKIE_DEMO=cookie-value
```

### Environment Files

The project supports multiple environment files:

- `.env` - Development (default)
- `.env.demo` - Demo environment
- `.env.production` - Production environment

```bash
# Use specific environment
ENV_PATH=.env.demo yarn dev-demo
ENV_PATH=.env.production yarn dev-prod
```

## Environment Flow by Context

### 🏠 Local Development

```
┌──────────────────┐
│   Docker Setup   │
│ (env generation) │
└─────────┬────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    .env file                                │
│  DB_USER=dev_user                                          │
│  DB_PASSWORD=dev_pass                                      │
│  JWT_SECRET=my-secret                                      │
│  AWS_ACCESS_KEY_ID=AKIA...                                 │
│  SENTRY_DSN=https://...                                    │
│  (ALL variables present)                                    │
└─────────────────────────────────────────────────────────────┘
          │                                │
          ▼                                ▼
┌─────────────────────┐          ┌─────────────────────┐
│     yarn dev        │          │   yarn db:migrate   │
│                     │          │                     │
│ src/config/env.ts   │          │ src/config/         │
│ ✅ ALL env vars     │          │ drizzle-only.ts     │
│ ✅ App starts       │          │ ✅ DB vars only     │
└─────────────────────┘          │ ✅ Migration works  │
                                 └─────────────────────┘
```

### 🤖 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                GitHub Actions Secrets                       │
│  DB_STRING_CONNECTION: postgresql://user:pass@host/db      │
│  (ONLY database connection)                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Migration Workflow                         │
│                                                             │
│  yarn db:migrate                                           │
│         │                                                   │
│         ▼                                                   │
│  drizzle.config.ts                                         │
│         │                                                   │
│         ▼                                                   │
│  src/config/drizzle-only.ts                               │
│         │                                                   │
│         ▼                                                   │
│  ✅ Validates ONLY database variables                       │
│  ✅ Migration succeeds                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              If CI tried to start app                       │
│                                                             │
│  src/config/env.ts                                         │
│         │                                                   │
│         ▼                                                   │
│  ❌ Missing AWS/Sentry variables                            │
│  ❌ Would fail validation                                   │
│  (But CI only runs migrations, not the app)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 Production Deployment

```
┌─────────────────────────────────────────────────────────────┐
│              Cloud Run Environment Variables                │
│  DB_STRING_CONNECTION: postgresql://prod-host/db           │
│  JWT_SECRET: prod-secret                                    │
│  AWS_ACCESS_KEY_ID: AKIA...                                 │
│  SENTRY_DSN: https://...                                    │
│  (ALL variables present)                                    │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Production Application                       │
│                                                             │
│  src/config/env.ts                                         │
│         │                                                   │
│         ▼                                                   │
│  ✅ Validates ALL environment variables                     │
│  ✅ Application starts successfully                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Environment Setup by Context

### Development Setup

1. **Start database**: `docker compose up -d`
2. **Environment created**: `.env` file auto-generated
3. **Start development**: `yarn dev`
4. **Run migrations**: `yarn db:migrate`

### CI/CD Setup

1. **Set secrets**: Add `DB_STRING_CONNECTION` to GitHub secrets
2. **Pipeline runs**: `yarn db:migrate` automatically
3. **Validation**: Only database connection validated

### Production Setup

1. **Set all variables**: Configure complete environment in Cloud Run
2. **Deploy application**: Full validation on startup
3. **Migrations**: Run automatically before deployment

## Usage Examples

### In Application Code

```typescript
import { env } from './config/env';

// Type-safe access
const port = env.PORT;
const isDevelopment = env.NODE_ENV === 'development';

// Environment-specific logic
if (env.NODE_ENV === 'production') {
  // Production-only features
}
```

### Adding New Variables

1. **Update schema** in `src/config/env.ts`:

   ```typescript
   const envSchema = z.object({
     // ... existing variables
     NEW_VARIABLE: z.string().min(1, 'New variable is required'),
   });
   ```

2. **Add to environment files**:

   ```bash
   # .env
   NEW_VARIABLE=development-value
   ```

3. **Update documentation** and inform team

## Validation and Error Handling

### Runtime Validation

Environment variables are validated at startup with detailed error messages:

```
❌ Environment Validation Failed

  - JWT_SECRET: Required
  - AWS_ACCESS_KEY_ID: Required
  - SENTRY_DSN: Required

💡 Tips:
  1. Run 'docker compose --profile initial up initial_setup'
  2. Check if all required variables are set in your .env file
  3. Verify the values match the expected types
```

### Type Safety

```typescript
// ✅ Good - Type-safe access
import { env } from './config/env';
const port = env.PORT; // TypeScript knows this is a number

// ❌ Bad - Unsafe access
const port = process.env.PORT; // TypeScript doesn't know the type
```

## Best Practices

### ✅ Do This

- Use type-safe environment access: `env.VARIABLE`
- Validate early and fail fast
- Use `DB_STRING_CONNECTION` for CI/Production
- Keep individual DB vars for local development
- Separate concerns (app vs migration config)

### ❌ Don't Do This

- Don't use `process.env` directly
- Don't put application secrets in CI for migrations
- Don't bypass environment validation
- Don't mix database and application configuration

## Troubleshooting

### Migration Fails in CI

**Symptoms**: `yarn db:migrate` fails with environment validation errors

**Solution**:

1. Check `DB_STRING_CONNECTION` is set in GitHub secrets
2. Verify connection string format: `postgresql://user:pass@host:port/db`

### Application Won't Start Locally

**Symptoms**: App fails with missing environment variables

**Solution**:

1. Run `docker compose --profile initial up initial_setup`
2. Check `.env` file contains all required variables
3. Update missing variables manually

### Database Connection Issues

**Symptoms**: Database connection errors during migrations

**Solution**:

1. Verify database is running: `docker compose ps`
2. Check connection string is correct
3. Test connection: `yarn db:studio`

### Type Errors

**Symptoms**: TypeScript errors when accessing environment variables

**Solution**:

```typescript
// Ensure you're importing from the right place
import { env } from './config/env'; // ✅ Correct
import { env } from 'process'; // ❌ Wrong
```

## Security Considerations

🚨 **Critical Safety Rules**

- **Never commit secrets** to repository
- **Use environment-specific secrets** (dev ≠ prod)
- **Follow ENVIRONMENT_MANAGEMENT.md** for production changes
- **Validate all inputs** at runtime
- **Rotate sensitive values** regularly
- **Use proper secrets management** in production

## Related Documentation

- [Environment Management](../../ENVIRONMENT_MANAGEMENT.md) - GCP environment variable safety
- [Getting Started](./getting-started.md) - Initial setup guide
- [Database Operations](./database-operations.md) - Database setup and migrations
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
