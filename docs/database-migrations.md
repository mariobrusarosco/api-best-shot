# Database Migrations Guide

## Overview

This guide explains how to handle database migrations in our project using Drizzle ORM.

## Quick Start

```bash
# Generate a new migration after modifying your schema
# e.g. yarn db:generate --name add_users_table
yarn db:generate --name <descriptive_migration_name>

# Apply all pending migrations
yarn db:migrate

# Seed the database (optional)
yarn db:seed

# Inspect applied migrations and database state
yarn db:check

# Open Drizzle Studio in your browser
yarn db:studio
```

## Best Practices

1. **One Change, One Migration**
   - Make one schema change at a time
   - Generate a separate migration for each change
   - Use clear, descriptive names for your changes

2. **Review Before Applying**
   - Always review generated migrations before applying
   - Check for unintended changes
   - Verify column names and types

3. **Testing Migrations**
   - Test migrations locally first
   - Use `db:check` to verify state
   - Keep track of applied migrations

4. **Troubleshooting**
   - If a migration fails, check the error message
   - Use `db:drop` to remove failed migrations
   - Use Supabase's SQL Editor for manual fixes if needed

## Common Commands

- `yarn db:generate` - Generate new migration files
- `yarn db:migrate` - Apply pending migrations
- `yarn db:check` - Check database state
- `yarn db:drop` - Remove failed migrations
- `yarn db:push` - Push schema changes
- `yarn db:studio` - Open Drizzle Studio

## Migration Workflow

1. Make changes to schema files
2. Run `yarn db:generate`
3. Review generated migration
4. Run `yarn db:migrate`
5. Verify with `yarn db:check`

## Emergency Fixes

If you encounter issues:

1. Check migration status with `yarn db:check`
2. Drop problematic migrations with `yarn db:drop`
3. Use Supabase SQL Editor for direct fixes
4. Re-generate and apply migrations

## Tips

- Keep migrations small and focused
- Use meaningful names for migrations
- Always backup data before major changes
- Test migrations in development first
- Use the automated script for consistency

## Running Migrations Locally

To run migrations locally, you need to have Docker Compose installed and set up.

### Prerequisites

1. Install Docker Compose
2. Clone the project repository
3. Set up environment variables

### Docker Compose Commands

1. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```
2. Stop the Docker containers:
   ```bash
   docker-compose down
   ```

### Environment Setup

1. Set up environment variables:
   - `DATABASE_URL`: The connection string for your database
   - `MIGRATION_DIR`: The directory containing your migration files

### Seed Scripts

1. Run seed scripts to populate the database:
   ```bash
   yarn db:seed
   ```

## Tips for Running Migrations Locally

1. **Use Docker for Isolation**: Docker containers provide a clean environment for running migrations.
2. **Set Up Environment Variables**: Ensure that the `DATABASE_URL` and `MIGRATION_DIR` environment variables are set correctly.
3. **Test Seed Scripts**: Before running migrations, test seed scripts to ensure data integrity.
4. **Monitor Logs**: Keep an eye on Docker logs and migration logs for any issues.
5. **Backup Data**: Always backup data before running migrations.

## Tips for Running Migrations in Production

1. **Use Automated Scripts**: Automated scripts are designed to handle production environments efficiently.
2. **Monitor Logs**: Keep an eye on production logs for any issues.
3. **Backup Data**: Always backup data before running migrations.
4. **Test in Staging**: Before running migrations in production, test in a staging environment.
5. **Communicate**: Communicate with stakeholders about upcoming migrations. 