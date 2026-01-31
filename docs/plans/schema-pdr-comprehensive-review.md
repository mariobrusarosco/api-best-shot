# Schema Product Design Review (PDR) - Comprehensive Analysis

**Created:** 2026-01-30  
**Status:** Draft  
**Objective:** Identify flaws and improvements across all database schemas in the Best Shot API

---

## Executive Summary

This PDR analyzes 9 database schemas across the Best Shot API application. The review identifies **critical data integrity issues**, **missing foreign key constraints**, **inconsistent typing**, **orphaned data risks**, and **performance optimization opportunities**.

### Critical Issues Found

- ❌ **15+ missing foreign key constraints** leading to orphaned data risks
- ❌ **Inconsistent data types** (text vs numeric for integers, text vs uuid for IDs)
- ❌ **Missing cascade delete policies** across all relations
- ❌ **No soft delete support** for critical business entities
- ❌ **Duplicate indexes** (primaryKey + uniqueIndex on same columns)
- ❌ **Typos in column names** (`shortame`, `longame`)

### Schemas Analyzed

1. ✅ Team (`T_Team`)
2. ⚠️ Match (`T_Match`) - Recently improved, minor issues remain
3. ❌ Tournament (`T_Tournament`, `T_TournamentStandings`, `T_TournamentMember`)
4. ❌ Guess (`T_Guess`)
5. ❌ League (`T_League`, `T_LeagueRole`, `T_LeagueTournament`)
6. ❌ Member (`T_Member`)
7. ❌ Tournament Round (`T_TournamentRound`)
8. ✅ Data Provider (`T_DataProviderExecutions`)
9. ⚠️ Score (Empty/Placeholder)

---

# Phase 1: Member Schema Improvements

## Goal

Fix the `member` schema to establish proper data integrity, security, and type safety as the foundational user entity.

## Tasks

### Task 1.1 - Add Missing Constraints and Indexes [✅]

**Severity:** HIGH  
**Impact:** Data integrity, security, query performance

**Current Issues:**

- `password` field is nullable (security risk)
- `role` field has no CHECK constraint (allows invalid values)
- Missing index on `publicId` (frequently queried)
- Missing index on `email` (used in authentication)

**Proposed Changes:**

```typescript
export const T_Member = pgTable(
  'member',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicId: text('public_id').notNull().unique(), // ✅ Already unique
    firstName: text('first_name'),
    lastName: text('last_name'),
    nickName: text('nick_name').notNull(),
    email: text('email').notNull().unique(), // ✅ Already unique
    password: text('password').notNull(), // ⚠️ Should be required for local auth
    role: text('role', { enum: ['member', 'admin'] })
      .notNull()
      .default('member'), // ✅ Add enum constraint
    deletedAt: timestamp('deleted_at'), // 🆕 Soft delete support
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    publicIdIdx: index('member_public_id_idx').on(table.publicId), // 🆕 Performance
    emailIdx: index('member_email_idx').on(table.email), // 🆕 Auth queries
  })
);
```

#### Task 1.1.1 - Schema Changes [✅]

- ✅ Kept `password` field nullable (supports OAuth users like Google OAuth2)
- ✅ Add enum constraint to `role` field
- ✅ Add `deletedAt` timestamp for soft deletes
- ✅ Generate migration (0012_overrated_mad_thinker.sql)

#### Task 1.1.2 - Add Indexes [✅]

- ✅ Add index on `publicId`
- ✅ Add index on `email`
- ✅ Migration includes CREATE INDEX statements

#### Task 1.1.3 - Update Type Definitions [✅]

- ✅ Moved `MemberRole` type before schema definition
- ✅ Used `MemberRole` type in schema enum constraint
- ✅ Added `DB_UpdateMember` type export

**Dependencies:** None  
**Expected Result:** Member schema has proper constraints, supports soft deletes, improved query performance  
**Next Steps:** Update queries/services to use soft deletes

---

# Phase 2: Tournament Schema Improvements

## Goal

Fix critical issues in the tournament domain schemas including foreign keys, data types, and typos.

## Tasks

### Task 2.1 - Fix T_TournamentStandings Schema []

**Severity:** CRITICAL  
**Impact:** Data integrity, orphaned data risk, type safety

**Current Issues:**

1. ❌ **Typos:** `shortame` → should be `shortName`, `longame` → should be `longName`
2. ❌ **Wrong Type:** `tournamentId` is `text` but should be `uuid` with FK to `T_Tournament.id`
3. ❌ **Wrong Type:** All numeric fields (`points`, `games`, `wins`, etc.) are `text` instead of `integer`
4. ❌ **Missing FK:** `teamExternalId` has no FK to `T_Team` (orphaned data risk)
5. ❌ **Wrong Composite PK:** Uses `shortName` (which is a typo) instead of logical keys

**Proposed Changes:**

```typescript
export const T_TournamentStandings = pgTable(
  'tournament_standings',
  {
    id: uuid('id').defaultRandom().primaryKey(), // ✅ Use proper PK
    teamId: uuid('team_id')
      .notNull()
      .references(() => T_Team.id), // 🆕 FK to team
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id), // ✅ FK constraint
    order: integer('order').notNull(), // ✅ Changed from numeric to integer
    groupName: text('group_name').default(''),
    shortName: text('short_name').notNull(), // ✅ Fixed typo
    longName: text('long_name').notNull(), // ✅ Fixed typo
    points: integer('points').notNull().default(0), // ✅ Changed from text
    games: integer('games').notNull().default(0), // ✅ Changed from text
    wins: integer('wins').notNull().default(0), // ✅ Changed from text
    draws: integer('draws').notNull().default(0), // ✅ Changed from text
    losses: integer('losses').notNull().default(0), // ✅ Changed from text
    goalsFor: integer('goals_for').notNull().default(0), // ✅ Renamed from gf, changed type
    goalsAgainst: integer('goals_against').notNull().default(0), // ✅ Renamed from ga, changed type
    goalDifference: integer('goal_difference').notNull().default(0), // ✅ Renamed from gd, changed type
    provider: text('provider').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    // Use proper unique constraint instead of composite PK
    uniqueTeamTournament: uniqueIndex('tournament_standings_team_tournament_idx').on(
      table.teamId,
      table.tournamentId,
      table.groupName
    ),
    tournamentIdx: index('tournament_standings_tournament_idx').on(table.tournamentId),
  })
);
```

#### Task 2.1.1 - Rename Columns (Breaking Change) [✅]

- Rename `shortame` → `short_name`
- Rename `longame` → `long_name`
- Rename `gf` → `goals_for`
- Rename `ga` → `goals_against`
- Rename `gd` → `goal_difference`
- Generate migration

**Important:** This renames SQL columns only. TypeScript field names (`gf`, `ga`, `gd`) remain unchanged to avoid breaking changes. See Task 2.1.5 for optional refactoring.

#### Task 2.1.2 - Fix Data Types [✅]

- Change `tournamentId` from text to uuid
- Change `order` from numeric to integer
- Change all stat fields from text to integer
- Generate migration

#### Task 2.1.3 - Add Foreign Keys [✅]

- Add FK: `teamId` references `T_Team.id`
- Add FK: `tournamentId` references `T_Tournament.id`
- Create data migration script to populate `teamId` from `teamExternalId`
- Generate migration

#### Task 2.1.4 - Update Queries and Services [✅]

- Update all queries to use new column names
- Update all queries to use new FK relationships
- Update seeding scripts

#### Task 2.1.5 - Refactor Field Names (Optional, Code Quality) []

**Purpose:** Improve code consistency by renaming TypeScript field names to match SQL columns

**Changes:**

- Rename TypeScript field: `gf` → `goalsFor`
- Rename TypeScript field: `ga` → `goalsAgainst`
- Rename TypeScript field: `gd` → `goalDifference`

**Files to update:**

- `src/domains/tournament/schema/index.ts` (schema definition)
- `src/domains/tournament/queries/index.ts` (queries using these fields)
- `src/domains/data-provider/services/standings.ts` (data mapping)
- `src/domains/ai/services/prediction-service.ts` (if using these fields)

**Note:** This is non-critical and can be done later for better maintainability.

**Dependencies:** Team schema must have UUID available  
**Expected Result:** Tournament standings with proper types, no orphaned data, correct column names  
**Next Steps:** Test data migration on local, then production

---

### Task 2.2 - Fix T_TournamentMember Schema [✅]

**Severity:** HIGH  
**Impact:** Data integrity, orphaned data risk

**Current Issues:**

1. ❌ **Missing FK:** `tournamentId` has no FK to `T_Tournament.id`
2. ❌ **Missing FK:** `memberId` has no FK to `T_Member.id`
3. ❌ **Missing Cascade:** No ON DELETE policy defined

**Proposed Changes:**

```typescript
export const T_TournamentMember = pgTable(
  'tournament_member',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // 🆕 FK + cascade
    memberId: uuid('member_id')
      .notNull()
      .references(() => T_Member.id, { onDelete: 'cascade' }), // 🆕 FK + cascade
    points: integer('points').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueMemberTournament: uniqueIndex('unique_member_tournament').on(table.memberId, table.tournamentId),
    tournamentIdx: index('tournament_member_tournament_idx').on(table.tournamentId), // 🆕 Performance
    memberIdx: index('tournament_member_member_idx').on(table.memberId), // 🆕 Performance
  })
);
```

#### Task 2.2.1 - Add Foreign Key Constraints [✅]

- Add FK: `tournamentId` references `T_Tournament.id` with `onDelete: 'cascade'`
- Add FK: `memberId` references `T_Member.id` with `onDelete: 'cascade'`
- Generate migration

#### Task 2.2.2 - Add Performance Indexes [✅]

- Add index on `tournamentId`
- Add index on `memberId`
- Generate migration

**Dependencies:** None  
**Expected Result:** Tournament members have proper FKs and cascade deletes  
**Next Steps:** Test deletion behavior

---

### Task 2.3 - Fix T_Tournament Schema [✅]

**Severity:** MEDIUM  
**Impact:** Data integrity

**Current Issues:**

1. ⚠️ **Inconsistent Design:** Has `externalId` but no composite PK like other external entities
2. ⚠️ **Missing Enum:** `mode`, `standingsMode`, `status` are text without constraints
3. ⚠️ **Type Safety:** Should use enum for mode and status

**Proposed Changes:**

```typescript
export const T_Tournament = pgTable(
  'tournament',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    baseUrl: text('base_url').notNull(),
    slug: text('slug').notNull().default(''),
    provider: text('provider').notNull(),
    season: text('season').notNull(),
    mode: text('mode', {
      enum: ['season', 'knockout', 'season-knockout'],
    }).notNull(), // ✅ Add enum
    standingsMode: text('standings_mode', {
      enum: ['table', 'groups', 'none'],
    })
      .notNull()
      .default('table'), // ✅ Add enum
    label: text('label').notNull(),
    logo: text('logo').notNull().default(''),
    status: text('status', {
      enum: ['active', 'completed', 'upcoming', 'cancelled'],
    })
      .notNull()
      .default('active'), // ✅ Add enum
    deletedAt: timestamp('deleted_at'), // 🆕 Soft delete
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueExternalIdSlug: uniqueIndex('unique_external_id_slug').on(table.externalId, table.slug),
    providerIdx: index('tournament_provider_idx').on(table.provider), // 🆕 Performance
  })
);
```

#### Task 2.3.1 - Add Enum Constraints [✅]

- Add enum to `mode` field
- Add enum to `standingsMode` field
- Add enum to `status` field
- Generate migration

#### Task 2.3.2 - Add Soft Delete Support [✅]

- Add `deletedAt` timestamp
- Generate migration

#### Task 2.3.3 - Add Performance Index [✅]

- Add index on `provider`
- Generate migration

**Dependencies:** None  
**Expected Result:** Tournament has proper type constraints and soft delete support  
**Next Steps:** Update services to filter by deletedAt

---

# Phase 3: Tournament Round Schema Improvements

## Goal

Fix type inconsistencies and add proper foreign key constraints to tournament rounds.

## Tasks

### Task 3.1 - Fix T_TournamentRound Schema [✅]

**Severity:** HIGH  
**Impact:** Data integrity, type safety

**Current Issues:**

1. ❌ **Wrong Type:** `tournamentId` is `text` but should be `uuid` with FK
2. ❌ **Wrong Type:** `order` is `text` but should be `integer`
3. ❌ **Missing FK:** No FK to `T_Tournament.id`
4. ❌ **Missing Enum:** `type` field has no constraint

**Proposed Changes:**

```typescript
export const T_TournamentRound = pgTable(
  'tournament_round',
  {
    id: uuid('id').defaultRandom().primaryKey(), // ✅ Change to regular PK
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // ✅ FK constraint
    order: integer('order').notNull(), // ✅ Changed from text
    label: text('label').notNull(),
    slug: text('slug').notNull(),
    knockoutId: text('knockout_id').default(''),
    prefix: text('prefix').default(''),
    providerUrl: text('provider_url').notNull(),
    providerId: text('provider_id').notNull(),
    type: text('type', { enum: ['regular', 'knockout'] }).notNull(), // ✅ Add enum
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueTournamentSlug: uniqueIndex('tournament_round_tournament_slug_idx').on(table.tournamentId, table.slug),
    tournamentOrderIdx: index('tournament_round_tournament_order_idx').on(table.tournamentId, table.order), // 🆕 For ordering queries
  })
);
```

#### Task 3.1.1 - Fix Primary Key Strategy [✅]

- Change from composite PK to single UUID PK
- Keep `(tournamentId, slug)` as unique constraint
- Generate migration

#### Task 3.1.2 - Fix Data Types [✅]

- Change `tournamentId` from text to uuid
- Change `order` from text to integer
- Generate migration

#### Task 3.1.3 - Add Foreign Key Constraint [✅]

- Add FK: `tournamentId` references `T_Tournament.id` with `onDelete: 'cascade'`
- Create data migration script to ensure data integrity
- Generate migration

#### Task 3.1.4 - Add Type Constraint [✅]

- Add enum constraint to `type` field
- Generate migration

**Dependencies:** Tournament schema Phase 2 completed  
**Expected Result:** Tournament rounds with proper types and FK constraints  
**Next Steps:** Update queries to use FK relationships

---

# Phase 4: Match & Guess Schema Standardization

## Goal

Ensure `T_Match` and `T_Guess` adhere to project standards (UUID PKs) and enforce strict referential integrity.

## Tasks

### Task 4.1 - Standardize T_Match Schema []

**Severity:** CRITICAL
**Impact:** Foundation for all match-related relationships

**Current Issues:**

1. ❌ **Non-Standard PK:** Uses Composite PK `(externalId, provider)`.
2. ❌ **Reference Block:** Cannot create FKs pointing to `T_Match` easily.

**Proposed Changes:**

1.  **Primary Key:** Set `id` (UUID) as the Primary Key.
2.  **Unique Constraint:** Replace Composite PK with Unique Index on `(externalId, provider)`.

#### Task 4.1.1 - Update T_Match Schema [✅]

- Change PK to `id` (UUID).
- Add Unique Index to `(externalId, provider)`.

#### Task 4.1.2 - Generate Match Migration [✅]

- Run `yarn db:generate`.

#### Task 4.1.3 - Apply Match Migration [✅]

- Run `yarn db:migrate`.
- Verify success.

### Task 4.2 - Standardize T_Guess Schema []

**Severity:** HIGH
**Impact:** Data integrity, Type safety

**Current Issues:**

1. ❌ **Non-Standard PK:** Uses Composite PK `(matchId, memberId)`.
2. ❌ **Missing FKs:** No database-level links to Match or Member.
3. ❌ **Wrong Types:** `roundId` (text), `scores` (numeric).

**Proposed Changes:**

1.  **Primary Key:** Set `id` (UUID) as Primary Key.
2.  **Unique Constraint:** Replace Composite PK with Unique Index on `(matchId, memberId)`.
3.  **Foreign Keys:** Add `matchId` -> `T_Match.id` (Cascade) and `memberId` -> `T_Member.id` (Cascade).
4.  **Types:** specific `integer` types for scores and roundId.

#### Task 4.2.1 - Update T_Guess Schema [✅]

- Change PK to `id` (UUID).
- Add Unique Index to `(matchId, memberId)`.
- Add FKs to `T_Match.id` and `T_Member.id`.
- Update Data Types (`roundSlug`, `scores`).
- Add Performance Indexes.

#### Task 4.2.2 - Generate Guess Migration [✅]

- Run `yarn db:generate`.
- **Manual Intervention:** Add `USING` clauses for type conversions.

#### Task 4.2.3 - Verify Data Integrity [✅]

- Check for orphan guesses (guesses pointing to missing matches/members) before applying.

#### Task 4.2.4 - Apply Guess Migration [✅]

- Run `yarn db:migrate`.

## Dependencies

- Task 4.1 must be completed before Task 4.2.

## Expected Result

**Dependencies:** Member and Match schemas completed  
**Expected Result:** Guess schema with proper FKs, no orphaned data, improved performance  
**Next Steps:** Update queries and test cascade deletes

---

# Phase 5: League Schema Improvements

## Goal

Add proper foreign key constraints and improve data integrity across league-related tables.

## Tasks

### Task 5.1 - Fix T_League Schema []

**Severity:** MEDIUM  
**Impact:** Data integrity

**Current Issues:**

1. ❌ **Missing FK:** `founderId` has no FK to `T_Member.id`
2. ⚠️ **No Soft Delete:** No soft delete support
3. ⚠️ **Optional Label:** Label allows nulls

#### Task 5.1.1 - Update T_League Schema [✅]

- Add FK: `founderId` -> `T_Member.id` (Restrict).
- Add `deletedAt` (Soft Delete).
- Make `label` Not Null.
- Add Performance Index (`founderIdx`).

#### Task 5.1.2 - Generate League Migration [✅]

- Run `yarn db:generate`.
- **Manual Check:** Ensure `label` change handles existing nulls (if any).

#### Task 5.1.3 - Verify Data Integrity (League) [✅]

- Check for orphan founders.
- Check for null labels.

#### Task 5.1.4 - Apply League Migration [✅]

- Run `yarn db:migrate`.

---

### Task 5.2 - Fix T_LeagueRole Schema []

**Severity:** HIGH  
**Impact:** Data integrity

**Current Issues:**

1. ❌ **Missing FKs:** No database links to League/Member.
2. ❌ **No Enum:** Role is free text.
3. ❌ **No Unique Constraint:** Duplicate assignments possible.

#### Task 5.2.1 - Update T_LeagueRole Schema [✅]

- Add FKs: League (Cascade), Member (Cascade).
- Add Enum: `admin`, `member`, `viewer`.
- Add Unique Constraint: `(leagueId, memberId)`.
- Add Performance Indexes.

#### Task 5.2.2 - Generate LeagueRole Migration [✅] (Hardened)

- Run `yarn db:generate`.
- **Manual Intervention:** Add `USING` clause if role values need mapping.

#### Task 5.2.3 - Verify Data Integrity (Roles) [✅] (Included in Migration)

- Check for invalid roles.
- Check for duplicate pairs.
- Check for orphans.

#### Task 5.2.4 - Apply LeagueRole Migration [✅] (Skipped Local Apply, Ready for CD)

- Run `yarn db:migrate`.

---

### Task 5.3 - Fix T_LeagueTournament Schema [✅]

**Severity:** HIGH  
**Impact:** Data integrity

**Current Issues:**

1. ❌ **Composite PK:** Uses legacy composite key logic.
2. ❌ **Missing FKs:** No database links.
3. ❌ **No Enum:** Status is free text.

#### Task 5.3.1 - Update T_LeagueTournament Schema [✅]

- Change PK to `id` (UUID).
- Add FKs: League (Cascade), Tournament (Cascade).
- Add Status Enum: `active`, `completed`, `upcoming`.
- Add Unique Constraint: `(leagueId, tournamentId)`.

#### Task 5.3.2 - Generate LeagueTournament Migration [✅] (Hardened)

- Run `yarn db:generate`.
- **Manual Intervention:** Add `USING` clause for status if needed.
- **Hardening:** Added SQL to populate IDs, map status, and cleanup orphans.

#### Task 5.3.3 - Verify Data Integrity (LT) [✅] (Included in Migration)

- Check for invalid statuses.
- Check for orphans.

#### Task 5.3.4 - Apply LeagueTournament Migration [✅] (Skipped Local Apply)

- Run `yarn db:migrate`.

---

# Phase 6: Match Schema Minor Improvements

## Goal

Complete the match schema improvements following the recent FK migration work.

## Tasks

### Task 6.1 - Add Missing Constraint to T_Match []

**Severity:** LOW  
**Impact:** Data integrity

**Current Issues:**

1. ⚠️ **Missing FK:** `tournamentId` has no FK to `T_Tournament.id` (currently text reference)
2. ⚠️ **Missing Enum:** `status` field has no constraint
3. ⚠️ **Inconsistent Naming:** Has both `roundSlug` (good) but tournament uses `tournamentId` as UUID

**Proposed Changes:**

```typescript
export const T_Match = pgTable(
  'match',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // 🆕 Add FK
    roundSlug: text('round_slug').notNull(),
    homeTeamId: uuid('home_team_id')
      .notNull()
      .references(() => T_Team.id), // ✅ Already has FK
    externalHomeTeamId: text('external_home_team_id').notNull(),
    homeScore: integer('home_score'), // ✅ Consider changing from numeric?
    homePenaltiesScore: integer('home_penalties_score'), // ✅ Consider changing from numeric?
    awayTeamId: uuid('away_team_id')
      .notNull()
      .references(() => T_Team.id), // ✅ Already has FK
    externalAwayTeamId: text('external_away_team_id').notNull(),
    awayScore: integer('away_score'), // ✅ Consider changing from numeric?
    awayPenaltiesScore: integer('away_penalties_score'), // ✅ Consider changing from numeric?
    date: timestamp('date'),
    time: text('time'), // ⚠️ Consider timestamp instead?
    stadium: text('stadium'),
    status: text('status', {
      enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'],
    }).notNull(), // ✅ Add enum
    tournamentMatch: text('tournament_match'),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.externalId, table.provider] }), // ⚠️ Consider single PK
    statusIdx: index('match_status_idx').on(table.status),
    tournamentRoundsIdx: index('match_tournament_rounds_idx').on(table.tournamentId, table.roundSlug),
    pollingIdx: index('match_polling_idx').on(table.status, table.date, table.lastCheckedAt),
  })
);
```

#### Task 6.1.1 - Add Tournament Foreign Key [x]

- Add FK: `tournamentId` references `T_Tournament.id` with `onDelete: 'cascade'`
- Generate migration

#### Task 6.1.2 - Add Status Enum Constraint [x]

- Add enum constraint to `status` field
- Generate migration

#### Task 6.1.3 - Consider Score Type Changes [x]

- **Discussion needed:** Should scores be `integer` instead of `numeric`?
- If YES: Change `homeScore`, `awayScore`, `homePenaltiesScore`, `awayPenaltiesScore` to integer
- Generate migration if approved

#### Task 6.1.4 - Consider Time Field Type [x]

- **Discussion needed:** Should `time` be part of `date` timestamp instead of separate text field?
- Document decision

**Dependencies:** Tournament schema completed  
**Expected Result:** Match schema fully normalized with all FKs  
**Next Steps:** Performance testing

---

# Phase 7: Data Provider Schema (Minor Review)

## Goal

Review and validate the data provider execution tracking schema.

## Tasks

### Task 7.1 - Review T_DataProviderExecutions Schema [x]

**Severity:** LOW  
**Impact:** Monitoring, observability

**Current State:** ✅ **Well-designed schema, minimal changes needed**

**Minor Improvements:**

1. ⚠️ **Missing FK:** `tournamentId` could have FK to `T_Tournament.id`
2. ⚠️ **Missing Enum:** `operationType` and `status` could use enums

**Proposed Changes:**

```typescript
export const T_DataProviderExecutions = pgTable(
  'data_provider_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // 🆕 FK
    operationType: text('operation_type', {
      enum: [
        'standings_create',
        'standings_update',
        'rounds_create',
        'rounds_update',
        'matches_create',
        'matches_update',
        'teams_create',
        'teams_update',
      ],
    }).notNull(), // ✅ Add enum
    status: text('status', {
      enum: ['in_progress', 'completed', 'failed'],
    }).notNull(), // ✅ Add enum
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    duration: integer('duration'),
    reportFileUrl: text('report_file_url'),
    reportFileKey: text('report_file_key'),
    summary: jsonb('summary'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    tournamentIdIdx: index('data_provider_executions_tournament_id_idx').on(table.tournamentId),
    operationTypeIdx: index('data_provider_executions_operation_type_idx').on(table.operationType),
    statusIdx: index('data_provider_executions_status_idx').on(table.status),
    startedAtIdx: index('data_provider_executions_started_at_idx').on(table.startedAt),
    requestIdIdx: index('data_provider_executions_request_id_idx').on(table.requestId),
  })
);
```

#### Task 7.1.1 - Add Tournament Foreign Key [x]

- Add FK: `tournamentId` references `T_Tournament.id` with `onDelete: 'cascade'`
- Generate migration

#### Task 7.1.2 - Add Enum Constraints [x]

- Add enum to `operationType` field
- Add enum to `status` field
- Generate migration

**Dependencies:** Tournament schema completed  
**Expected Result:** Data provider executions with proper constraints  
**Next Steps:** None

---

# Phase 8: Team Schema Review

## Goal

Review the team schema for any final improvements.

## Tasks

### Task 8.1 - Review T_Team Schema [x]

**Severity:** LOW  
**Impact:** Minor improvements

**Current State:** ✅ **Generally well-designed**

**Minor Improvements:**

1. ⚠️ **Missing Enum:** `provider` could use enum constraint
2. ⚠️ **Unique Constraint:** `id.unique()` is redundant since composite PK exists

**Proposed Changes:**

```typescript
export const T_Team = pgTable(
  'team',
  {
    id: uuid('id').defaultRandom().unique(), // ✅ Keep for FK references
    name: text('name').notNull(),
    externalId: text('external_id').notNull(),
    shortName: text('short_name'),
    badge: text('badge').notNull(),
    provider: text('provider', {
      enum: ['sofascore', 'api-football'],
    }).notNull(), // ✅ Add enum
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.provider, table.externalId] }),
    nameIdx: index('team_name_idx').on(table.name), // 🆕 For search queries
  })
);
```

#### Task 8.1.1 - Add Provider Enum [x] (Postponed)

- Add enum constraint to `provider` field
- Generate migration

#### Task 8.1.2 - Add Name Index [x]

- Add index on `name` for search queries
- Generate migration

**Dependencies:** None  
**Expected Result:** Team schema with provider enum and search optimization  
**Next Steps:** None

---

# Phase 9: Score Schema (Empty Placeholder)

## Goal

Determine if Score schema is needed or should be removed.

## Tasks

### Task 9.1 - Investigate Score Domain [x]

**Severity:** LOW  
**Impact:** Code cleanliness

**Current State:** ✅ **Resolved**

**Findings:**

- Domain IS used by `MatchUpdateOrchestratorService`
- `ScoreboardService` handles point calculations and Redis leaderboards
- Logic relies on `T_TournamentMember` and Redis, so no specific SQL tables are needed for this domain currently.

#### Task 9.1.1 - Code Review [x]

- Search for any references to score domain
- Check service layer for score-related logic
- Document findings: **Used in Scheduler/Match Update**

#### Task 9.1.2 - Decision [x]

- **Decision:** **Keep Domain Logic, Remove Empty Schema**
- The `src/domains/score/schema/index.ts` file was empty and has been deleted.
- The `Score` domain will remain to encapsulate scoring rules and leaderboard services.

**Dependencies:** None  
**Expected Result:** Cleaned up project structure  
**Next Steps:** None

---

# Implementation Order & Dependencies

## Recommended Sequence

```
1. Phase 1 (Member) → No dependencies, foundational
2. Phase 2 (Tournament) → Required for many FKs
3. Phase 3 (Tournament Round) → Depends on Tournament
4. Phase 8 (Team) → Already good, minor improvements
5. Phase 6 (Match) → Depends on Team + Tournament
6. Phase 4 (Guess) → Depends on Member + Match
7. Phase 5 (League) → Depends on Member + Tournament
8. Phase 7 (Data Provider) → Depends on Tournament
9. Phase 9 (Score) → Independent investigation
```

## Critical Path

**Must complete before production:**

- Phase 1 (Member FK and constraints)
- Phase 2.1 (Tournament Standings - CRITICAL TYPOS + TYPE ISSUES)
- Phase 2.2 (Tournament Member FKs)
- Phase 3 (Tournament Round FKs)
- Phase 4 (Guess FKs)
- Phase 5.2 (League Role FKs)
- Phase 5.3 (League Tournament FKs)

**Can defer:**

- Soft delete implementations (nice to have)
- Performance indexes (can add incrementally)
- Enum constraints (can add after testing)

---

# Risk Assessment

## High Risk Changes

1. **T_TournamentStandings column renaming** - Breaking change, requires data migration
2. **T_TournamentStandings type changes** - Text to integer conversion, needs validation
3. **Composite PK to single PK changes** - Could break existing queries

## Medium Risk Changes

1. **Adding NOT NULL constraints** - Need to ensure no NULL values exist
2. **Adding FK constraints** - Need to ensure referential integrity
3. **Adding enum constraints** - Need to ensure all values are valid

## Low Risk Changes

1. **Adding indexes** - Performance improvement, no breaking changes
2. **Adding soft delete fields** - Additive, no breaking changes
3. **Adding enums to new fields** - No existing data affected

---

# Success Criteria

## Phase Completion Checklist

For each phase:

- [ ] Schema changes reviewed and approved
- [ ] Migration files generated
- [ ] Data migration scripts created (if needed)
- [ ] Migrations tested locally
- [ ] Query layer updated
- [ ] Service layer updated
- [ ] Type definitions updated
- [ ] Tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Deployed to production
- [ ] Production data migration executed (if needed)
- [ ] Verified in production

## Overall Success Metrics

- ✅ Zero orphaned records in any table
- ✅ All foreign keys properly defined with cascade policies
- ✅ All enum fields have constraints
- ✅ All numeric fields use appropriate types (integer vs numeric vs text)
- ✅ No column name typos
- ✅ Consistent naming conventions across schemas
- ✅ Soft delete support for critical entities
- ✅ Performance indexes on frequently queried fields
- ✅ 100% TypeScript compilation success
- ✅ All tests passing

---

# Notes

- Each task should be reviewed by user before proceeding
- Migrations should be tested locally before production deployment
- Data migration scripts should be idempotent
- Consider creating a rollback plan for each phase
- Monitor Sentry for errors after each deployment

---

**END OF PDR**
