# Database Migrations Guide

## Overview

Best Shot API uses Drizzle ORM for database migrations. This guide explains how to:

- Create migrations
- Apply migrations
- Handle migration errors
- Set up migrations in CI/CD

## Local Development

### Creating Migrations

```bash
# Generate migration files
npx drizzle-kit generate:pg

# Push migrations to database
npx drizzle-kit push:pg
```

### Environment Setup

Required environment variables:

```env
DB_HOST=localhost      # Database host
DB_PORT=5497          # Database port
DB_USER=dev_user      # Database username
DB_PASSWORD=dev_pass  # Database password
DB_NAME=bestshot_dev  # Database name
```

For local development, these values are provided by Docker Compose.

## CI/CD Setup

### Environment Variables

For demo and production environments, set these secrets in GitHub:

```env
DB_HOST      # Supabase database host
DB_PORT      # Usually 5432 for Supabase
DB_USER      # Database username
DB_PASSWORD  # Database password
DB_NAME      # Database name
```

### GitHub Actions

The workflow will:

1. Install dependencies
2. Run migrations using environment variables
3. Log results

Example workflow:

```yaml
name: Database Migrations

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: demo # or production

    steps:
      - uses: actions/checkout@v3

      - name: Apply migrations
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_NAME: ${{ secrets.DB_NAME }}
          NODE_ENV: demo # or production
        run: npx drizzle-kit push:pg
```

## Troubleshooting

### Common Issues

1. **Connection Errors**

   - Check if database is running
   - Verify environment variables
   - Ensure correct host (localhost for local, Supabase host for demo/prod)

2. **Permission Issues**

   - Verify database user permissions
   - Check if user can create/alter tables

3. **Migration Conflicts**
   - Review migration files
   - Check current database state
   - Consider resetting local database

### Resetting Local Database

```bash
# Stop containers
docker compose down -v

# Start fresh
docker compose up -d

# Apply migrations
npx drizzle-kit push:pg
```

## Best Practices

1. **Always Review Migrations**

   - Check generated SQL
   - Test migrations locally
   - Back up production data

2. **Use Meaningful Names**

   - Prefix with timestamp
   - Describe changes clearly
   - Example: `20230615_add_user_roles.sql`

3. **Keep Migrations Small**

   - One logical change per migration
   - Easier to review and rollback
   - Better error handling

4. **Test Migration Process**
   - Test locally first
   - Use demo environment
   - Verify rollback procedures
