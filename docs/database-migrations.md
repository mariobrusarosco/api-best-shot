# Database Migrations Guide

## Overview

This guide explains how to handle database migrations in our project using Drizzle ORM.

## Quick Start

```bash
# Generate a new migration
yarn db:generate

# Apply pending migrations
yarn db:migrate

# Check database state
yarn db:check

# Use the automated script (recommended)
./scripts/db-migrate.sh
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