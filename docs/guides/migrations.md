# Database Migrations Guide

This guide explains how to work with database migrations in our project, which uses both Drizzle ORM for schema definitions and Supabase for database management.

## Technology Stack

- **Drizzle ORM**: Used for type-safe schema definitions
- **Supabase**: Used for database hosting
- **drizzle-kit**: CLI tool for managing migrations

## Project Structure

```
├── src/
│   └── domains/
│       └── [domain]/
│           └── schema/
│               └── index.ts    # Drizzle schema definitions
└── drizzle/                   # Generated migration files
```

## Creating New Tables

### 1. Define Schema in Drizzle

First, define your table schema in the appropriate domain folder using Drizzle's type-safe schema builder:

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const YourTable = pgTable('table_name', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Export types for type safety
export type DB_InsertYourTable = typeof YourTable.$inferInsert;
export type DB_UpdateYourTable = typeof YourTable.$inferInsert;
export type DB_SelectYourTable = typeof YourTable.$inferSelect;
```

### 2. Generate Migration

After defining your schema, use drizzle-kit to generate the migration:

```bash
npx drizzle-kit generate --name init_tables
```

This will create a new migration file in the `drizzle` directory with a timestamp and your specified name:

```
📦 drizzle
 ├ 📂 meta
 └ 📜 0000_init_tables.sql
```

### 3. Apply Migration

To apply the migration to your database:

```bash
npx drizzle-kit migrate
```

## Modifying Existing Tables

### 1. Update Drizzle Schema

First, modify the table definition in your Drizzle schema file:

```typescript
export const ExistingTable = pgTable('existing_table', {
  // ... existing columns ...
  newColumn: text('new_column').notNull().default(''),
});
```

### 2. Generate and Apply Migration

Generate a new migration for your changes:

```bash
npx drizzle-kit generate --name add_new_column
```

Then apply it:

```bash
npx drizzle-kit migrate
```

## Best Practices

1. **Descriptive Names**: Use clear, descriptive names for your migrations (e.g., `add_user_email`, `create_products_table`)
2. **Review Generated SQL**: Always review the generated SQL in the migration files before applying
3. **Version Control**: Commit both schema changes and generated migrations
4. **Testing**: Test migrations on a development database before applying to production

## Troubleshooting

### Common Issues

1. **Migration Failed**:

   - Check the drizzle-kit output for detailed error messages
   - Verify your schema definitions
   - Ensure database connection is properly configured

2. **Type Mismatch**:

   - Ensure your schema types match your database requirements
   - Check the Drizzle documentation for correct type mappings

3. **Constraint Violations**:
   - When adding NOT NULL constraints, ensure existing data complies
   - Use appropriate default values in your schema definitions

## Need Help?

If you encounter issues:

1. Check the drizzle-kit documentation
2. Review your schema definitions
3. Test migrations in a development environment first
4. Consult the team for complex schema changes

## Configuration

Create a `drizzle.config.ts` file in your project root:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/domains/**/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

This configuration tells drizzle-kit:

- Where to find your schema files
- Where to output migration files
- Which database driver to use
- How to connect to your database
