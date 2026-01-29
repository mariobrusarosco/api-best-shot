# Match ↔ Team FK Migration Plan

## Overview

Migrate the `match` table to have proper foreign key relationships to the `team` table.

### Current State

**Match Table:**

- `homeTeamId` → `uuid` (new field, not in production DB yet)
- `externalHomeTeamId` → `text` (Sofascore external ID, new field)
- `awayTeamId` → `uuid` (new field, not in production DB yet)
- `externalAwayTeamId` → `text` (Sofascore external ID, new field)

**Team Table:**

- `id` → `uuid` (auto-generated, but NOT the primary key)
- `externalId` → `text` (Sofascore external ID)
- `provider` → `text`
- Primary Key: `(provider, externalId)` ← Composite key

### Target State

**Match Table:**

- `homeTeamId` → `uuid` FK → `team.id`
- `externalHomeTeamId` → `text` (kept for Sofascore reference)
- `awayTeamId` → `uuid` FK → `team.id`
- `externalAwayTeamId` → `text` (kept for Sofascore reference)

**Team Table:**

- `id` → `uuid` with `UNIQUE` constraint (required for FK reference)

---

# Phase 1: Local Database Preparation

## Goal

Prepare the local database by adding the UNIQUE constraint on `team.id` and creating nullable FK columns on `match`.

## Tasks

### Task 1.1 - Add UNIQUE constraint to `team.id` []

- Modify `src/domains/team/schema/index.ts`
- Add `.unique()` to the `id` column definition
- This is required because FK must reference a UNIQUE or PRIMARY KEY column

### Task 1.2 - Update `match` schema with proper FK references []

- Modify `src/domains/match/schema/index.ts`
- Ensure `homeTeamId` and `awayTeamId` are **nullable** initially
- Add `.references(() => T_Team.id)` to both columns
- Keep `externalHomeTeamId` and `externalAwayTeamId` as `notNull()`

### Task 1.3 - Generate migration []

- Run `yarn db:generate` to create the migration SQL
- Review the generated SQL for correctness

### Task 1.4 - Apply migration to local DB []

- Run `yarn db:migrate` to apply the migration
- Verify the schema changes in Drizzle Studio

## Dependencies

- Local database must be running (`docker compose up -d`)
- No active connections blocking schema changes

## Expected Result

- `team.id` has a UNIQUE constraint
- `match.home_team_id` and `match.away_team_id` columns exist as nullable UUIDs with FK to `team.id`
- `match.external_home_team_id` and `match.external_away_team_id` columns exist as NOT NULL text

## Next Steps

Proceed to Phase 2: Data Migration

---

# Phase 2: Data Migration (Populate FK Columns)

## Goal

Populate `homeTeamId` and `awayTeamId` with the correct `team.id` values by joining on `externalId` and `provider`.

## Tasks

### Task 2.1 - Create data migration script []

- Create `scripts/migrations/populate-match-team-fks.ts`
- Script should:
  1. Fetch all matches with `homeTeamId IS NULL` or `awayTeamId IS NULL`
  2. For each match, lookup the team by `externalId` + `provider`
  3. Update the match with the correct `team.id`
  4. Log any orphaned matches (matches without a corresponding team)

### Task 2.2 - Run data migration on local DB []

- Execute the script: `npx ts-node scripts/migrations/populate-match-team-fks.ts`
- Verify all matches have non-null FK values

### Task 2.3 - Validate data integrity []

- Run a validation query to check for:
  - Matches with NULL `homeTeamId` or `awayTeamId`
  - FK values that don't exist in `team.id`

## Dependencies

- Phase 1 must be complete
- All teams must exist in the database before running

## Expected Result

- All `match.home_team_id` and `match.away_team_id` values are populated
- No orphaned matches

## Next Steps

Proceed to Phase 3: Make FK Columns NOT NULL

---

# Phase 3: Make FK Columns NOT NULL

## Goal

Alter the FK columns to be NOT NULL after data migration is complete.

## Tasks

### Task 3.1 - Update schema to make FK columns NOT NULL []

- Modify `src/domains/match/schema/index.ts`
- Change `homeTeamId` and `awayTeamId` from nullable to `.notNull()`

### Task 3.2 - Generate and apply migration []

- Run `yarn db:generate`
- Run `yarn db:migrate`
- This will add NOT NULL constraints to the columns

### Task 3.3 - Fix query layer []

- Update `src/domains/match/queries/index.ts`
- Fix the JOIN conditions in `getMatchesByTournament`:
  - Change: `eq(T_Match.homeTeamId, homeTeam.externalId)`
  - To: `eq(T_Match.homeTeamId, homeTeam.id)`
- Same for `awayTeam` join

## Dependencies

- Phase 2 must be complete (all data populated)
- No NULL values in FK columns

## Expected Result

- FK columns are NOT NULL
- Queries use correct JOIN conditions on `team.id`

## Next Steps

Proceed to Phase 4: Update Application Code

---

# Phase 4: Update Application Code

## Goal

Ensure all application code uses the new FK columns correctly.

## Tasks

### Task 4.1 - Audit match creation/upsert code []

- Review `upsertMatches` and `createMatches` in match queries
- Ensure match insert payloads include proper `homeTeamId` and `awayTeamId` UUIDs
- Update any code that creates matches to fetch team UUIDs first

### Task 4.2 - Audit admin/scraper code []

- Review Sofascore scraper and admin code
- Ensure team lookup happens before match creation
- Team creation should happen first, then match creation with team UUIDs

### Task 4.3 - Run tests []

- Run `yarn test` to verify no regressions
- Run `yarn compile` to check TypeScript

## Dependencies

- Phase 3 must be complete

## Expected Result

- Application code correctly uses the new FK relationship
- All tests pass
- TypeScript compiles without errors

## Next Steps

Repeat phases on staging/production environment

---

# Phase 5: Production Deployment (Future)

## Goal

Apply the same changes to production database.

## Tasks

### Task 5.1 - Deploy schema migration []

### Task 5.2 - Run data migration script []

### Task 5.3 - Deploy NOT NULL migration []

### Task 5.4 - Verify production data []

## Dependencies

- All previous phases tested locally
- Backup of production database

## Expected Result

- Production database has proper FK relationships
- Application running correctly with new schema

---

# Summary

| Phase | Description             | Status      |
| ----- | ----------------------- | ----------- |
| 1     | Local DB Preparation    | ✅ Complete |
| 2     | Data Migration          | ✅ Complete |
| 3     | Make FK NOT NULL        | ✅ Complete |
| 4     | Update Application Code | ⚠️ Skipped  |
| 5     | Production Deployment   | 🔜 Ready    |
