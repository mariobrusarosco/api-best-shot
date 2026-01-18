# Database Migrations Guide

NEVER ALTER ANY DATABASE FILE WITHOUT ASKING ME

## Overview

This project uses Drizzle ORM for database migrations with full automation for production deployments. Migrations are automatically applied during CI/CD to ensure database and application code stay in sync.

## Development Workflow

### Making Schema Changes

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Modify    │→ │  Generate   │→ │    Apply    │→ │    Test     │
│   Schema    │  │ Migration   │  │  Locally    │  │  Changes    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
      │                  │                  │              │
      │                  │                  │              │
   Edit .ts          yarn db:         yarn db:         yarn dev
   files in         generate          migrate          & test
   domains/         --name            │                │
   */schema/        "desc"           │                │
      │                  │                  │              │
      ▼                  ▼                  ▼              ▼
   Schema            Migration         Database        Verify
   Updated           File Created      Updated         Working
```

### Step-by-Step Process

1. **Modify Schema Files**

   ```bash
   # Edit schema in TypeScript
   # Example: src/domains/member/schema/index.ts
   ```

2. **Generate Migration**

   ```bash
   yarn db:generate --name "add_user_role_field"
   ```

3. **Apply Locally**

   ```bash
   yarn db:migrate
   ```

4. **Test Changes**

   ```bash
   yarn dev
   # Test your API endpoints
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "Add user role field"
   git push origin main
   ```

## Production Deployment Flow

### Automated Deployment Process

```
┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    Push     │→ │  CI Checks   │→ │  Migrations  │→ │   Deploy     │
│  to Main    │  │   (Tests,    │  │   Applied    │  │ Application  │
└────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
      │                  │                  │              │
      │                  │                  │              │
   Developer         Quality            Auto             Auto
   commits           checks:            migration        deployment
   changes           • Lint             to demo DB       to Cloud Run
      │              • Type check       │                │
      │              • Tests            │                │
      │              • Build            │                │
      ▼                  ▼                  ▼              ▼
   Triggers          All Pass          Schema           App Uses
   GitHub            or Fail           Updated          New Schema
   Actions           Pipeline          │                │
                                      │                │
                                  Database             Zero
                                  Ready for            Downtime
                                  New Code             Deployment
```

### Deployment Sequence

```
┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐
│ Developer│  │    CI    │  │ Migration │  │  Build  │  │ Deploy  │
└────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘  └────┬────┘
     │             │              │              │              │
     │ git push    │              │              │              │
     ├─────────────►              │              │              │
     │             │              │              │              │
     │             │ run tests    │              │              │
     │             ├─────────────►│              │              │
     │             │              │              │              │
     │             │              │ yarn db:     │              │
     │             │              │ migrate      │              │
     │             │              ├──────────────►              │
     │             │              │              │              │
     │             │              │              │ docker build │
     │             │              │              ├──────────────►
     │             │              │              │              │
     │             │              │              │              │ cloud run
     │             │              │              │              │ deploy
     │             │              │              │              ├────────►
     │             │              │              │              │
     │ success     │              │              │              │
     │◄──────────────────────────────────────────────────────────
     │             │              │              │              │
```

## Migration Commands

### Development Commands

```bash
# Generate migration from schema changes
yarn db:generate --name "descriptive_name"

# Apply pending migrations
yarn db:migrate

# Drop a generated migration (BEFORE applying it)
yarn db:drop
# Use this to remove migrations from the journal if you generated one by mistake
# or need to regenerate it. Only use on migrations that haven't been applied yet!

# Reset database (development only)
yarn db:reset

# Open database UI
yarn db:studio

# Seed database with test data
yarn db:seed
```

### Production Commands (Manual)

```bash
# Emergency migration (via GitHub Actions)
# Go to: Actions → Database Migrations → Run workflow
# Select environment: demo/production
```

## Architecture

### Migration File Structure

```
supabase/migrations/
├── 0000_initial_complete_schema.sql     # Base schema
├── 0001_add_user_roles.sql              # Feature addition
├── 0002_fix_tournament_dates.sql        # Bug fix
└── meta/
    ├── _journal.json                    # Migration history
    ├── 0000_snapshot.json               # Schema snapshots
    ├── 0001_snapshot.json
    └── 0002_snapshot.json
```

### Schema Organization

```
src/domains/
├── member/schema/index.ts               # Member table definitions
├── tournament/schema/index.ts           # Tournament tables
├── match/schema/index.ts                # Match data
└── services/database/schema.ts          # Aggregates all schemas
```

## Emergency Procedures

### Manual Migration (GitHub Actions)

1. **Access GitHub Actions**

   - Go to repository → Actions tab
   - Select "Database Migrations" workflow

2. **Run Migration**
   ```
   ┌─────────────────────────────────┐
   │     Manual Migration Flow       │
   ├─────────────────────────────────┤
   │                                 │
   │  1. Select "Run workflow"       │
   │  2. Choose environment:         │
   │     ○ demo                      │
   │     ○ production                │
   │  3. Click "Run workflow"        │
   │                                 │
   │  🔄 Workflow runs migrations    │
   │  ✅ Success/failure reported    │
   │                                 │
   └─────────────────────────────────┘
   ```

### Rollback Procedure

If a migration causes issues:

1. **Immediate Action**

   ```bash
   # Revert to previous working commit
   git revert HEAD
   git push origin main
   ```

2. **Database Recovery**
   - Access database directly via Supabase dashboard
   - Use SQL editor to manually fix schema if needed
   - Run corrective migration

## Best Practices

### ✅ Do This

- **Small, focused migrations**: One logical change per migration
- **Descriptive names**: `add_user_email_verification`, not `fix_stuff`
- **Test locally first**: Always run `yarn db:migrate` locally
- **Review generated SQL**: Check migration files before committing
- **Backup before major changes**: Use database backup features

### ❌ Don't Do This

- **Never edit existing migration files**: Create new ones instead
- **Don't skip local testing**: Always test migrations locally
- **Avoid large schema changes**: Break them into smaller migrations
- **Don't bypass CI**: Let automated migrations run in CI/CD
- **Don't apply and then drop**: Only use `yarn db:drop` on migrations that haven't been applied yet

### 🔧 Fixing Mistakes

**If you generated a migration with errors (BEFORE applying it):**
1. Use `yarn db:drop` to remove it from the journal
2. Fix your schema
3. Regenerate with `yarn db:generate --name "correct_name"`

**If you already applied a migration:**
- Don't drop it! Create a new migration to fix the issue

## Troubleshooting

### Common Issues

1. **Migration Fails in CI**

   ```
   🔍 Check: GitHub Actions logs
   🔍 Verify: Database connection secrets
   🔍 Test: Run migration locally first
   ```

2. **Schema Out of Sync**

   ```
   🛠️ Fix: Generate new migration with current differences
   🛠️ Command: yarn db:generate --name "sync_schema"
   ```

3. **Database Connection Issues**
   ```
   🔍 Check: DEMO_DB_CONNECTION secret in GitHub
   🔍 Verify: Database is accessible from GitHub Actions
   ```

### Support

- **Local Issues**: Check CLAUDE.md for development setup
- **CI/CD Issues**: Review GitHub Actions logs
- **Schema Questions**: Examine existing domain schemas for patterns

## Migration History

This project maintains a clean migration history starting from:

- **0000_initial_complete_schema.sql**: Complete base schema with all tables
- Future migrations build incrementally from this foundation

This approach ensures perfect sync between development and production environments.
