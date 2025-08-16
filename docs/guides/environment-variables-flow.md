# Environment Variables Flow Guide

This guide explains how environment variables work across different contexts in the Best Shot API project.

## Overview

The project uses **context-aware environment validation** to handle different requirements across development, CI/CD, and production environments.

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

## Configuration Files

### Application Environment (`src/config/env.ts`)

- **Purpose**: Full application runtime configuration
- **Validates**: ALL environment variables
- **Used by**: Application startup (`src/index.ts`)
- **Requirements**: Complete environment setup

### Database-Only Environment (`src/config/drizzle-only.ts`)

- **Purpose**: Database migrations only
- **Validates**: Database connection variables only
- **Used by**: Drizzle configuration (`drizzle.config.ts`)
- **Requirements**: Database credentials only

## Environment Variables by Category

### Database Variables

```bash
# Connection string (preferred)
DB_STRING_CONNECTION=postgresql://user:pass@host:5432/dbname

# Individual components (fallback)
DB_USER=dev_user
DB_PASSWORD=dev_pass
DB_NAME=bestshot_dev
DB_HOST=postgres
DB_PORT=5432
```

### Application Variables

```bash
# Core application
NODE_ENV=development
PORT=9090
API_VERSION=/v2
API_DOMAIN=http://localhost:9090

# Security
JWT_SECRET=your-jwt-secret
MEMBER_PUBLIC_ID_COOKIE=best-shot-auth
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:5173
INTERNAL_SERVICE_TOKEN=your-internal-token

# AWS Services
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret
AWS_ACCOUNT_ID=123456789
AWS_BUCKET_NAME=your-bucket
AWS_CLOUDFRONT_URL=your-cloudfront-url
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
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

## Best Practices

### ✅ Do This

- Use `DB_STRING_CONNECTION` for CI/Production
- Keep individual DB vars for local development
- Validate early and fail fast
- Separate concerns (app vs migration config)

### ❌ Don't Do This

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

## Security Considerations

🚨 **Critical Safety Rules**

- **Never commit secrets** to repository
- **Use environment-specific secrets** (dev ≠ prod)
- **Follow ENVIRONMENT_MANAGEMENT.md** for production changes
- **Validate all inputs** at runtime

## Related Documentation

- [Environment Management](../../ENVIRONMENT_MANAGEMENT.md) - GCP environment variable safety
- [Environment Configuration](./environment-configuration.md) - Detailed configuration guide
- [Development Environment](../development-environment.md) - Local setup guide
- [Database Migrations](../database-migrations.md) - Migration workflow
