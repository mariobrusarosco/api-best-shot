# Drizzle ORM Migration Guide

This guide covers the proper usage of Drizzle ORM for database migrations in the API Best Shot project.

## Local Development

### Creating Schema Changes

1. Modify the schema files in `src/services/database/schema.ts`
2. Apply changes to your local database:

```bash
npx drizzle-kit migrate
```

This will:

- Read your database schema from `src/services/database/schema.ts`
- Generate migration files in `supabase/migrations`
- Apply those migrations to the database specified in your `.env` file

### Testing Migrations Locally

Before committing your changes, always test migrations locally:

```bash
# Apply migrations to local database
npx drizzle-kit migrate
```

## CI/CD Pipeline

Our GitHub Actions workflow automatically applies database migrations to the demo environment when changes are pushed to the main branch.

### How It Works

1. The workflow checks out the latest code
2. It installs dependencies using Yarn
3. It runs `drizzle-kit migrate` using the database connection stored in GitHub Secrets

### Important Notes

- The database connection string in GitHub Secrets should include quotes to properly handle special characters
- The workflow uses our existing `drizzle.config.ts` file which is configured to read from the `DB_STRING_CONNECTION` environment variable

### Troubleshooting

If migrations fail in the CI/CD pipeline:

1. Check if the database connection string is properly stored in GitHub Secrets (with quotes)
2. Verify that the migration can be run locally with your changes
3. Review the GitHub Actions logs for specific error messages

## Common Commands

```bash
# Generate migrations without applying them
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate

# Direct schema push (no migration files)
npx drizzle-kit push
```

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/migrations)
- [GitHub Actions Workflow](../../.github/workflows/demo-migrations.yml)
