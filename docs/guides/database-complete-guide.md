# Database Complete Guide

⚠️ **CRITICAL: NEVER ALTER ANY DATABASE FILE WITHOUT ASKING ME**

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Migrations](#2-migrations)
3. [Transactions](#3-transactions)
4. [Seeding](#4-seeding)
5. [Quick Reference](#5-quick-reference)

---

## 1. Overview & Architecture

### Database Stack

Best Shot API uses:
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe database toolkit
- **Automated CI/CD** - Migrations applied automatically on deployment

### Schema Organization

Schemas are organized by domain:

```
src/domains/
├── member/schema/index.ts               # Member table definitions
├── tournament/schema/index.ts           # Tournament tables
├── match/schema/index.ts                # Match data
├── guess/schema/index.ts                # User predictions
└── services/database/schema.ts          # Aggregates all schemas
```

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

**Migration History:**
- Project maintains clean migration history from `0000_initial_complete_schema.sql`
- All future migrations build incrementally from this foundation
- Ensures perfect sync between development and production

---

## 2. Migrations

### Development Workflow

#### Making Schema Changes

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

#### Step-by-Step Process

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

### Production Deployment Flow

#### Automated Deployment Process

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

#### Deployment Sequence

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

### Migration Commands

#### Development Commands

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

#### Production Commands (Manual)

```bash
# Emergency migration (via GitHub Actions)
# Go to: Actions → Database Migrations → Run workflow
# Select environment: demo/production
```

### Emergency Procedures

#### Manual Migration (GitHub Actions)

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

#### Rollback Procedure

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

### Best Practices

#### ✅ Do This

- **Small, focused migrations**: One logical change per migration
- **Descriptive names**: `add_user_email_verification`, not `fix_stuff`
- **Test locally first**: Always run `yarn db:migrate` locally
- **Review generated SQL**: Check migration files before committing
- **Backup before major changes**: Use database backup features

#### ❌ Don't Do This

- **Never edit existing migration files**: Create new ones instead
- **Don't skip local testing**: Always test migrations locally
- **Avoid large schema changes**: Break them into smaller migrations
- **Don't bypass CI**: Let automated migrations run in CI/CD
- **Don't apply and then drop**: Only use `yarn db:drop` on migrations that haven't been applied yet

#### 🔧 Fixing Mistakes

**If you generated a migration with errors (BEFORE applying it):**
1. Use `yarn db:drop` to remove it from the journal
2. Fix your schema
3. Regenerate with `yarn db:generate --name "correct_name"`

**If you already applied a migration:**
- Don't drop it! Create a new migration to fix the issue

### Troubleshooting

#### Common Issues

**1. Migration Fails in CI**
```
🔍 Check: GitHub Actions logs
🔍 Verify: Database connection secrets
🔍 Test: Run migration locally first
```

**2. Schema Out of Sync**
```
🛠️ Fix: Generate new migration with current differences
🛠️ Command: yarn db:generate --name "sync_schema"
```

**3. Database Connection Issues**
```
🔍 Check: DEMO_DB_CONNECTION secret in GitHub
🔍 Verify: Database is accessible from GitHub Actions
```

---

## 3. Transactions

### What is a Database Transaction?

A **transaction** is a sequence of database operations that are treated as a single unit of work. Think of it like a contract - either everything in the contract gets executed, or nothing does.

### ACID Properties

Transactions follow the **ACID** principles:

- **A**tomicity: All operations succeed or all fail
- **C**onsistency: Database remains in valid state
- **I**solation: Concurrent transactions don't interfere
- **D**urability: Committed changes are permanent

### The Problem: Without Transactions

```typescript
// ❌ Dangerous - no transaction
async function updateStandings(standings) {
  for (const standing of standings) {
    await db.insert(T_TournamentStandings).values(standing)
      .onConflictDoUpdate({...});
  }
}
```

**What could go wrong:**
- Standing #1: ✅ Success
- Standing #2: ✅ Success
- Standing #3: ❌ **Fails** (network error, constraint violation, etc.)
- Standing #4: ❌ **Never attempted**

**Result:** Your database is in an inconsistent state - some standings updated, others not!

### The Solution: With Transactions

```typescript
// ✅ Safe - with transaction
async function updateStandings(standings) {
  await db.transaction(async (tx) => {
    for (const standing of standings) {
      await tx.insert(T_TournamentStandings).values(standing)
        .onConflictDoUpdate({...});
    }
  });
}
```

**What happens:**
- Standing #1: ✅ Success (but not committed yet)
- Standing #2: ✅ Success (but not committed yet)
- Standing #3: ❌ **Fails**
- **ROLLBACK**: All changes from #1 and #2 are undone
- Database remains in original state

### Real-World Example

Imagine updating Premier League standings after a match day:

```typescript
const standings = [
  { shortName: 'MAN', points: '45' }, // +3 points (won)
  { shortName: 'LIV', points: '42' }, // +0 points (lost)
  { shortName: 'CHE', points: '38' }, // +1 point (drew)
  // ... 17 more teams
];

// Without transaction:
// If it fails on Chelsea, Man City has wrong points but Liverpool doesn't!
// League table is now incorrect and inconsistent

// With transaction:
// If it fails on Chelsea, EVERYTHING rolls back
// League table remains in previous consistent state
```

### Transaction States

```
BEGIN TRANSACTION
├── Operation 1 ✅
├── Operation 2 ✅
├── Operation 3 ❌ (fails)
└── ROLLBACK (undo all changes)

// OR

BEGIN TRANSACTION
├── Operation 1 ✅
├── Operation 2 ✅
├── Operation 3 ✅
└── COMMIT (make all changes permanent)
```

### Benefits in Our Code

```typescript
await db.transaction(async tx => {
  for (const standing of standings) {
    await tx
      .insert(T_TournamentStandings)
      .values(standing)
      .onConflictDoUpdate({
        target: [T_TournamentStandings.shortName, T_TournamentStandings.tournamentId],
        set: { ...standing },
      });
  }
});
```

**Guarantees:**
1. **All teams updated** OR **no teams updated**
2. **No partial updates** that could confuse users
3. **Database stays consistent** even if server crashes mid-operation
4. **Other users** don't see intermediate states

### When to Use Transactions

✅ **Use transactions when:**
- Multiple related operations must succeed together
- Data consistency is critical
- Failure of one operation should undo others

❌ **Don't need transactions for:**
- Single, independent operations
- Read-only operations
- Operations where partial success is acceptable

**Key Insight:** Database transactions are like having a "safety net" that ensures your data stays reliable and consistent, no matter what goes wrong during the operation!

---

## 4. Seeding

### Seeding Approach

Our database seeding uses a simple, direct approach:
- A single script in `scripts/seed-db.ts` handles the seeding process
- Currently, only member data is seeded
- The script is idempotent (can be run multiple times safely)
- Environment-specific seeding is handled through environment variables

### Seeding Commands

We provide two commands to seed different environments:

**Local Development:** Seed your local database
```bash
yarn db:seed
```

**Demo Environment:** Seed the remote demo database
```bash
yarn db:seed:demo
```

### How It Works

The seeding script:
1. Connects to the database using the configuration for the current environment
2. Checks for existing records before inserting to avoid duplicates
3. Creates test users with consistent credentials

### Current Seed Data

Currently, the seeding process creates the following data:

**Members:**
- Admin user with OAuth (mariobrusarosco@gmail.com)
- Test user with password (test@example.com) - password is 'test123'
- Additional demo users (John Doe, Jane Smith) - password is 'test123'

### Extending the Seeding Process

To add seeding for additional entities (tournaments, rounds, etc.):

1. Add the new seed data and logic to `scripts/seed-db.ts`
2. Maintain the idempotent approach (check before inserting)
3. Keep the environment detection logic

---

## 5. Quick Reference

### 🚀 Common Commands

**Migration Commands:**
```bash
# Generate migration from schema changes
yarn db:generate --name "descriptive_name"

# Apply pending migrations
yarn db:migrate

# Drop a migration (before applying)
yarn db:drop

# Reset database (dev only)
yarn db:reset

# Open Drizzle Studio UI
yarn db:studio
```

**Seeding Commands:**
```bash
# Seed local database
yarn db:seed

# Seed demo environment
yarn db:seed:demo
```

**Transaction Template:**
```typescript
// Use transactions for multi-step operations
await db.transaction(async (tx) => {
  // All operations here
  await tx.insert(...);
  await tx.update(...);
  // Either all succeed or all rollback
});
```

### 📊 Database Queries

**Check Migration Status:**
```sql
-- View applied migrations
SELECT * FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

**Verify Seed Data:**
```sql
-- Check members
SELECT id, email, name FROM "T_Member"
WHERE email LIKE '%test%' OR email LIKE '%demo%';
```

**Check Table Schema:**
```sql
-- View table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'T_Member';
```

### 🚨 Emergency Procedures

**Migration Failed in CI:**
1. Check GitHub Actions logs for error details
2. Verify database connection secrets
3. Test migration locally: `yarn db:migrate`
4. Fix schema and regenerate migration
5. Push corrected migration

**Need to Rollback Migration:**
```bash
# Revert code
git revert HEAD
git push origin main

# Or manually via Supabase dashboard SQL editor
```

**Schema Out of Sync:**
```bash
# Generate sync migration
yarn db:generate --name "sync_schema"
yarn db:migrate
```

### 📋 Best Practices Checklist

**Before Every Migration:**
- [ ] Schema changes are small and focused
- [ ] Migration has descriptive name
- [ ] Tested locally with `yarn db:migrate`
- [ ] Reviewed generated SQL file
- [ ] All tests pass

**When Writing Database Code:**
- [ ] Use transactions for multi-step operations
- [ ] Check for existing records before inserting (idempotency)
- [ ] Use proper TypeScript types from schema
- [ ] Test with both empty and populated database

**Production Deployment:**
- [ ] CI/CD pipeline runs migrations automatically
- [ ] Never edit existing migration files
- [ ] Let automated process handle deployments
- [ ] Monitor GitHub Actions for success/failure

### ⚠️ Common Pitfalls

| Issue | Problem | Solution |
|-------|---------|----------|
| **Edited existing migration** | Breaks migration history | Never edit - create new migration instead |
| **Skipped local testing** | Migration fails in CI | Always test with `yarn db:migrate` first |
| **No transaction for multi-step** | Partial updates on failure | Wrap related operations in `db.transaction()` |
| **Applied then dropped** | Broken migration journal | Only drop migrations that haven't been applied |
| **Large schema changes** | Hard to debug/rollback | Break into smaller, incremental migrations |

### 🔍 Troubleshooting Guide

**Symptoms & Solutions:**

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| Migration fails locally | Schema syntax error | Check generated SQL, fix schema, regenerate |
| Migration fails in CI | Connection/secrets issue | Verify `DEMO_DB_CONNECTION` in GitHub secrets |
| Schema out of sync | Missed migration or manual edit | Generate sync migration |
| Duplicate entries when seeding | Not idempotent | Add existence checks before inserting |
| Transaction rollback | One operation failed | Check error logs, fix failing operation |

### 📚 Related Documentation

- **Queue System:** See `/docs/guides/job-queues-with-pgboss.md` for pg-boss database schema
- **Deployment:** See GitHub Actions workflows for automated migration process
- **Reset Strategy:** See `/docs/adr/003-database-reset-strategy.md` for architectural decision

---

**Document Version:** 1.0
**Created:** January 29, 2026
**Last Updated:** January 29, 2026
**Status:** Current

**Changelog:**
- **v1.0 (Jan 29, 2026):** Unified documentation from database-migrations, database-transactions-guide, and database-seeding guides