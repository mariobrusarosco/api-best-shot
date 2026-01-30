# Database Schema Comprehensive Analysis

**Created:** 2026-01-30  
**Status:** Analysis Complete  
**Scope:** Full RLS Policy Planning

---

## Executive Summary

The Best Shot API uses a Domain-Driven Design architecture with PostgreSQL. The database contains 11 core tables organized around three primary domains:

1. **User & Authorization** - Member and role management
2. **League System** - League creation, tournament participation, member roles
3. **Prediction System** - Matches, team data, user guesses, tournament standings

Key finding: **Current access control is entirely application-layer based** (middleware + API logic). There are **NO Row-Level Security (RLS) policies** at the database level.

---

## Complete Table Structure & Relationships

### 1. MEMBER TABLE
**Purpose:** Core user identity and global role  
**Sensitivity:** HIGH (PII - passwords, emails, names)

```
Table: member
├─ id (UUID, PK)                    - User unique identifier
├─ public_id (TEXT, UNIQUE)         - Public-facing user identifier
├─ email (TEXT, UNIQUE)             - Authentication key (PII)
├─ password (TEXT, NULLABLE)        - Hashed password (SENSITIVE)
├─ nick_name (TEXT)                 - Display name
├─ first_name (TEXT, NULLABLE)      - PII
├─ last_name (TEXT, NULLABLE)       - PII
├─ role (TEXT, DEFAULT: 'member')   - Global role: ['member', 'admin']
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

Unique Constraints:
├─ public_id (UNIQUE INDEX)
└─ email (UNIQUE INDEX)
```

**Sensitive Data Indicators:**
- Email (authentication, contact info)
- Password (authentication credential)
- First/Last name (PII)
- Role (determines system-wide permissions)

**Current Access Pattern:**
```typescript
// Application only fetches current user's member record
const getMember = async (memberId: string) => {
  // memberId comes from JWT token (already authenticated)
  const member = await db.select()
    .from(T_Member)
    .where(eq(T_Member.id, memberId));
}
```

---

### 2. LEAGUE TABLE
**Purpose:** Container for user competitions and prediction groups  
**Sensitivity:** MEDIUM (some user-created content)

```
Table: league
├─ id (UUID, PK)                    - League unique identifier
├─ founder_id (UUID, FK→member)     - Creator reference
├─ label (TEXT, NULLABLE, UNIQUE)   - League display name
├─ description (TEXT, NULLABLE)     - League details
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
└─ founder_id → member.id

Unique Constraints:
└─ label (UNIQUE INDEX)
```

**Access Patterns:**
- Founder can: create, read, update, delete their own leagues
- Members can: read leagues they're part of
- Non-members: cannot access (except maybe league discovery)

```typescript
// Current: Only members of a league can read it
const checkMembership = (memberId: string, leagueId: string) => {
  // Checked via league_role table before returning league details
}

// Gets only leagues where member has a role
const getMemberLeagues = async (memberId: string) => {
  const leagues = await db
    .select()
    .from(T_League)
    .innerJoin(T_LeagueRole, eq(T_League.id, T_LeagueRole.leagueId))
    .where(eq(T_LeagueRole.memberId, memberId));
}
```

---

### 3. LEAGUE_ROLE TABLE
**Purpose:** Membership and role assignment in leagues  
**Sensitivity:** MEDIUM (defines access control)

```
Table: league_role
├─ id (UUID, PK)
├─ league_id (UUID, FK→league)      - League reference
├─ member_id (UUID, FK→member)      - Member reference
├─ role (TEXT)                      - Role type (admin, member, etc.)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
├─ league_id → league.id
└─ member_id → member.id

Composite Key:
└─ (league_id, member_id) implied uniqueness
```

**Role Types:** (inferred from code)
- `admin` - League administrator (can manage members, settings)
- `member` - Regular league participant

**Access Patterns:**
```typescript
// Check if member has role in league
const getMemberLeagueRole = async (memberId: string, leagueId: string) => {
  const [role] = await db
    .select()
    .from(T_LeagueRole)
    .where(and(
      eq(T_LeagueRole.memberId, memberId),
      eq(T_LeagueRole.leagueId, leagueId)
    ));
  return role;
}

// Get all members in league
const getLeagueDetails = async (leagueId: string) => {
  const members = await db
    .select()
    .from(T_LeagueRole)
    .innerJoin(T_League, eq(T_League.id, leagueId))
    .innerJoin(T_Member, eq(T_Member.id, T_LeagueRole.memberId))
    .where(eq(T_LeagueRole.leagueId, leagueId));
  return members;
}
```

---

### 4. LEAGUE_TOURNAMENT TABLE
**Purpose:** Links tournaments to leagues for tracking  
**Sensitivity:** LOW (operational metadata)

```
Table: league_tournament
├─ id (UUID, generated)
├─ league_id (UUID, FK→league, PK part)
├─ tournament_id (UUID, FK→tournament, PK part)
├─ status (TEXT)                    - 'tracked', 'inactive', etc.
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
├─ league_id → league.id
└─ tournament_id → tournament.id

Composite Primary Key:
└─ (league_id, tournament_id)
```

**Access Patterns:**
```typescript
// Get tournaments in a league
const getLeagueTournaments = async (leagueId: string) => {
  const tournaments = await db
    .select()
    .from(T_LeagueTournament)
    .leftJoin(T_Tournament, eq(T_LeagueTournament.tournamentId, T_Tournament.id))
    .where(and(
      eq(T_LeagueTournament.leagueId, leagueId),
      eq(T_LeagueTournament.status, 'tracked')
    ));
}
```

---

### 5. TOURNAMENT TABLE
**Purpose:** Represents external tournaments (World Cup, Euro, etc.)  
**Sensitivity:** LOW (public sports data)

```
Table: tournament
├─ id (UUID, PK)
├─ external_id (TEXT)               - External provider ID (SofaScore)
├─ base_url (TEXT)                  - Provider base URL
├─ slug (TEXT, DEFAULT: '')         - URL-friendly identifier
├─ provider (TEXT)                  - Data provider (sofascore, etc.)
├─ season (TEXT)                    - Tournament season (2024, 2025, etc.)
├─ mode (TEXT)                      - Type: group, knockout, mixed
├─ standings_mode (TEXT)             - Standings calculation mode
├─ label (TEXT)                     - Display name (World Cup 2024)
├─ logo (TEXT, DEFAULT: '')         - Logo URL
├─ status (TEXT, DEFAULT: 'active') - active/inactive
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

Unique Constraints:
└─ (external_id, slug) UNIQUE INDEX
```

**Notes:**
- All data comes from external provider (SofaScore API)
- Public/read-only from user perspective
- Modified only by system processes (Lambda functions)

---

### 6. TOURNAMENT_MEMBER TABLE
**Purpose:** Track member participation and points in tournaments  
**Sensitivity:** MEDIUM (user-specific performance)

```
Table: tournament_member
├─ id (UUID, PK)
├─ tournament_id (UUID, FK→tournament)  - Tournament reference
├─ member_id (UUID, FK→member)          - Member reference
├─ points (INTEGER, DEFAULT: 0)         - User's score in tournament
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
├─ tournament_id → tournament.id
└─ member_id → member.id

Composite Unique Index:
└─ (member_id, tournament_id) - One entry per member per tournament
```

**Note:** This was in original schema but no longer used in current TypeScript schema files. Appears replaced by `tournament_standings` table.

---

### 7. TOURNAMENT_STANDINGS TABLE
**Purpose:** Store team standings in tournaments  
**Sensitivity:** LOW (calculated standings)

```
Table: tournament_standings
├─ id (UUID, generated)
├─ team_external_id (TEXT, PK part)     - Team identifier from provider
├─ tournament_id (TEXT, PK part)         - Tournament identifier
├─ order (NUMERIC)                      - Standings position
├─ group_name (TEXT, DEFAULT: '')       - Group name (if applicable)
├─ shortame (TEXT)                      - Team short name (typo: "shortame")
├─ longame (TEXT)                       - Team full name (typo: "longame")
├─ points (TEXT)                        - Points earned
├─ games (TEXT)                         - Games played
├─ wins (TEXT)                          - Wins
├─ draws (TEXT)                         - Draws
├─ losses (TEXT)                        - Losses
├─ gf (TEXT)                            - Goals for
├─ ga (TEXT)                            - Goals against
├─ gd (TEXT)                            - Goal difference
├─ provider (TEXT)                      - Data provider
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

Composite Primary Key:
└─ (shortame, tournament_id)
```

**Notes:**
- All data from external provider
- Read-only from user perspective
- System-populated only

---

### 8. TOURNAMENT_ROUND TABLE
**Purpose:** Define tournament structure (group stages, knockouts)  
**Sensitivity:** LOW (structure metadata)

```
Table: tournament_round
├─ id (UUID, generated)
├─ tournament_id (TEXT, PK part)     - Tournament reference
├─ order (TEXT)                      - Round order/sequence
├─ label (TEXT)                      - Round name (Group Stage, QF, etc.)
├─ slug (TEXT, PK part)              - URL-friendly identifier
├─ knockout_id (TEXT, DEFAULT: '')   - Knockout bracket reference
├─ prefix (TEXT, DEFAULT: '')        - Round prefix
├─ provider_url (TEXT)               - Link to provider
├─ provider_id (TEXT)                - Provider's round ID
├─ type (TEXT)                       - Round type (group, knockout, etc.)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

Composite Primary Key:
└─ (tournament_id, slug)
```

---

### 9. TEAM TABLE
**Purpose:** Store team information from external provider  
**Sensitivity:** LOW (public team data)

```
Table: team
├─ id (UUID, generated, UNIQUE)      - Internal reference
├─ name (TEXT)                       - Team full name
├─ external_id (TEXT, PK part)       - Provider's team ID
├─ short_name (TEXT, NULLABLE)       - Team abbreviation
├─ badge (TEXT)                      - Logo/badge URL
├─ provider (TEXT, PK part)          - Data provider
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

Composite Primary Key:
└─ (provider, external_id)

Unique Constraints:
└─ id (UNIQUE INDEX) - Though not PK, prevents duplicate UUIDs
```

---

### 10. MATCH TABLE
**Purpose:** Store match/game information  
**Sensitivity:** MEDIUM (match state, scores)

```
Table: match
├─ id (UUID, PK - not composite)         - Internal UUID
├─ external_id (TEXT, PK part)           - Provider's match ID (composite)
├─ provider (TEXT, PK part)              - Data provider (composite)
├─ tournament_id (UUID, FK→tournament)   - Tournament reference
├─ round_slug (TEXT)                     - Round identifier
├─ home_team_id (UUID, FK→team)          - Home team reference
├─ external_home_team_id (TEXT)          - Provider's home team ID
├─ home_score (NUMERIC, NULLABLE)        - Home team score
├─ home_penalties_score (NUMERIC, NULLABLE) - Penalty score (if applicable)
├─ away_team_id (UUID, FK→team)          - Away team reference
├─ external_away_team_id (TEXT)          - Provider's away team ID
├─ away_score (NUMERIC, NULLABLE)        - Away team score
├─ away_penalties_score (NUMERIC, NULLABLE) - Penalty score (if applicable)
├─ date (TIMESTAMP, NULLABLE)            - Match date/time
├─ time (TEXT, NULLABLE)                 - Match time
├─ stadium (TEXT, NULLABLE)              - Stadium name
├─ status (TEXT)                         - Status: not_started, live, finished
├─ tournament_match (TEXT, NULLABLE)     - Tournament context
├─ last_checked_at (TIMESTAMP, NULLABLE) - Last polling time
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
├─ tournament_id → tournament.id
├─ home_team_id → team.id
└─ away_team_id → team.id

Composite Primary Key:
└─ (external_id, provider)

Indexes:
├─ match_status_idx (status)
├─ match_tournament_rounds_idx (tournament_id, round_slug)
└─ match_polling_idx (status, date, last_checked_at)
```

**Access Patterns:**
- Matches are **publicly readable** (display schedule/results)
- Users create guesses against matches (see GUESS table)

---

### 11. GUESS TABLE
**Purpose:** Store user predictions/guesses for matches  
**Sensitivity:** HIGH (user-created predictions, used for scoring)

```
Table: guess
├─ id (UUID, PK - not used as primary)   - Unique identifier
├─ member_id (UUID, FK→member, PK part) - Member reference (composite)
├─ match_id (UUID, FK→match, PK part)   - Match reference (composite)
├─ round_id (TEXT, DEFAULT: '')         - Round identifier
├─ home_score (NUMERIC, NULLABLE)       - Predicted home score
├─ away_score (NUMERIC, NULLABLE)       - Predicted away score
├─ active (BOOLEAN, DEFAULT: true)      - Whether guess is active
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
├─ member_id → member.id
└─ match_id → match.id

Composite Primary Key:
└─ (match_id, member_id)

Unique Constraints:
└─ (match_id, member_id) UNIQUE INDEX
```

**Access Patterns:**
```typescript
// Members can only read their own guesses
const getMemberGuesses = async (memberId: string, tournamentId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(
      eq(T_Match.tournamentId, tournamentId),
      eq(T_Guess.memberId, memberId)  // FILTERED by memberId
    ));
}

// Get all guesses for a match (likely for scoring/leaderboard)
const getGuessesByMatchId = async (matchId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(eq(T_Guess.matchId, matchId));
}
```

---

### 12. DATA_PROVIDER_EXECUTIONS TABLE
**Purpose:** Audit trail for external data operations  
**Sensitivity:** LOW (operational metadata)

```
Table: data_provider_executions
├─ id (UUID, PK)
├─ request_id (UUID)                     - Request tracking reference
├─ tournament_id (UUID, FK→tournament)   - Tournament affected
├─ operation_type (TEXT)                 - standings_create, standings_update, etc.
├─ status (TEXT)                         - in_progress, completed, failed
├─ started_at (TIMESTAMP, DEFAULT: now())
├─ completed_at (TIMESTAMP, NULLABLE)    - When operation completed
├─ duration (INTEGER, NULLABLE)          - Duration in milliseconds
├─ report_file_url (TEXT, NULLABLE)      - S3 URL to report
├─ report_file_key (TEXT, NULLABLE)      - S3 key to report
├─ summary (JSONB, NULLABLE)             - Operation summary stats
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

FK Relationships:
└─ tournament_id → tournament.id

Indexes:
├─ data_provider_executions_tournament_id_idx
├─ data_provider_executions_operation_type_idx
├─ data_provider_executions_status_idx
├─ data_provider_executions_started_at_idx
└─ data_provider_executions_request_id_idx
```

**Notes:**
- System-only table (no user interaction)
- Administrative audit trail

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MEMBER                                  │
│  (Global Identity & Roles)                                      │
├─────────────────────────────────────────────────────────────────┤
│  id (PK) │ email │ password │ role (admin|member)              │
└────┬──────────────────┬──────────────────┬──────────────────────┘
     │                  │                  │
     │ founder_id       │ member_id        │ member_id
     ▼                  ▼                  ▼
  ┌──────────────────────────────────────────────────┐
  │          LEAGUE_ROLE                             │
  │  (League Membership & Permissions)               │
  ├──────────────────────────────────────────────────┤
  │  league_id │ member_id │ role                    │
  └──┬────────────────────────────────────────────────┘
     │ league_id
     ▼
  ┌──────────────────────────────────────────────────┐
  │          LEAGUE                                  │
  │  (User-created competition groups)               │
  ├──────────────────────────────────────────────────┤
  │  id (PK) │ founder_id │ label                    │
  └──┬────────────────────────────────────────────────┘
     │ tournament_id
     ▼
  ┌──────────────────────────────────────────────────┐
  │          LEAGUE_TOURNAMENT                       │
  │  (Tournament tracking per league)                │
  ├──────────────────────────────────────────────────┤
  │  league_id │ tournament_id │ status               │
  └──┬────────────────────────────────────────────────┘
     │ tournament_id
     ▼
  ┌──────────────────────────────────────────────────┐
  │          TOURNAMENT                              │
  │  (External sports tournaments)                   │
  ├──────────────────────────────────────────────────┤
  │  id (PK) │ external_id │ provider │ label        │
  └──┬────────────────────────────────────────────────┘
     │                           
     │                    ┌──────────────────┐
     │                    │  TOURNAMENT_ROUND│
     │                    │  (Stage/Phase)   │
     │                    └──────────────────┘
     │
     ├─────────────────────┬─────────────────────┐
     │                     │                     │
     │ tournament_id       │ tournament_id       │ tournament_id
     ▼                     ▼                     ▼
  ┌──────────────────────────────────────────────────┐
  │          MATCH                                   │
  │  (Individual games)                              │
  ├──────────────────────────────────────────────────┤
  │  id │ tournament_id │ round_slug │ status        │
  │  home_team_id │ away_team_id │ scores           │
  └──┬────────────────────────────────────────────────┘
     │ match_id
     ▼
  ┌──────────────────────────────────────────────────┐
  │          GUESS                                   │
  │  (User predictions - HIGH SENSITIVITY)           │
  ├──────────────────────────────────────────────────┤
  │  match_id │ member_id │ home_score │ away_score  │
  └──────────────────────────────────────────────────┘
     │ member_id
     └──► MEMBER

┌──────────────────────────────────────────────────────┐
│          TEAM                                        │
│  (Team information from provider)                    │
├──────────────────────────────────────────────────────┤
│  id │ external_id │ provider │ name │ badge         │
└──────────────────────────────────────────────────────┘
  ▲                                     ▲
  │ home_team_id                        │ away_team_id
  └─────────────── MATCH ───────────────┘

┌──────────────────────────────────────────────────────┐
│          TOURNAMENT_STANDINGS                        │
│  (Team standings in tournaments)                     │
├──────────────────────────────────────────────────────┤
│  tournament_id │ team_external_id │ order │ stats   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│          DATA_PROVIDER_EXECUTIONS                    │
│  (System audit trail)                                │
├──────────────────────────────────────────────────────┤
│  id │ tournament_id │ operation_type │ status        │
└──────────────────────────────────────────────────────┘
```

---

## Data Sensitivity Classification

### CRITICAL/HIGH SENSITIVITY
Requires strict access control and RLS policies:

| Table | Column(s) | Reason | Access Rules |
|-------|-----------|--------|--------------|
| member | id, email, password, role | PII + Auth credentials | Only self + admin |
| member | first_name, last_name | PII | Only self + league members (context-dependent) |
| guess | * (all columns) | User predictions used for scoring | Only self + league members viewing scoreboard |
| league_role | member_id, role | Determines access to league | Only league members + league admin |

### MEDIUM SENSITIVITY
Requires contextual access control:

| Table | Column(s) | Reason | Access Rules |
|-------|-----------|--------|--------------|
| league | * | User-created content | League members + founder |
| league_tournament | * | League configuration | League members + founder |
| match | scores, status | Live match data | All authenticated users (read-only) |

### LOW SENSITIVITY
Mostly public, minimal access control:

| Table | Column(s) | Reason | Access Rules |
|-------|-----------|--------|--------------|
| tournament | * | External public data | All users (read-only) |
| tournament_standings | * | Calculated standings | All users (read-only) |
| tournament_round | * | Tournament structure | All users (read-only) |
| team | * | External public data | All users (read-only) |
| data_provider_executions | * | System audit | Admin only |

---

## Current Access Control Patterns (Application Layer)

### 1. Member Data Access
```typescript
// Only authenticated users can read their own member record
const getMember = async (memberId: string) => {
  // memberId extracted from JWT token
  // No explicit row filtering - trusts middleware
}

// Admin can read any member record
// Regular members cannot read other member records
// This is enforced at API level, NOT database level
```

### 2. League Access
```typescript
// Members can only read leagues they're part of
// Enforced via league_role join
const getMemberLeagues = async (memberId: string) => {
  // Filters by league_role.member_id = memberId
  // This is implicit membership check
}

// Getting league details also checks membership
const getLeague = async (memberId: string, leagueId: string) => {
  // Checks: is memberId in league_role for leagueId?
  // Returns 403 if not
}

// League founder has implicit admin permissions
// Stored as founder_id in league table
```

### 3. Guess Access
```typescript
// Members can only read their own guesses
const getMemberGuesses = async (memberId: string, tournamentId: string) => {
  // Filters where guess.member_id = memberId
  // Only returns guesses for tournaments they're part of via leagues
}

// Getting guesses for a match (for scoreboard)
// Likely restricted to league members viewing shared scoreboard
```

### 4. Admin Access
```typescript
// Global admin role is enforced via middleware
const AdminMiddleware = async (req, res, next) => {
  const member = await MemberService.getMemberById(tokenData.id);
  if (member.role !== 'admin') {
    return res.status(403).send('Admin access required');
  }
}

// Admins can:
// - Access data_provider_executions
// - Likely modify tournament/team data
// - Manage system-level operations
```

---

## Missing Observations from Code

### Issues with Current Approach

1. **No Foreign Key Constraints** - Guesses reference match_id as UUID but match has composite PK (external_id, provider). This could allow orphaned guesses.

2. **Inconsistent Type Handling** - tournament_id in tournament_standings is TEXT but in tournament table is UUID.

3. **No Explicit Uniqueness on league_role** - Should have UNIQUE constraint on (league_id, member_id).

4. **Typos in tournament_standings** - Column names "shortame" and "longame" instead of "short_name" and "long_name".

5. **No Cascade Deletes** - Deleting a member leaves orphaned entries in guess, league_role, etc.

---

## RLS Policy Planning Framework

### Recommended Policy Categories

#### 1. Member Table Policies
```
- SELECT:   Only self OR admin
- INSERT:   Only during auth/signup (minimal)
- UPDATE:   Only self or admin
- DELETE:   Only admin
```

#### 2. League Table Policies
```
- SELECT:   Self as founder OR member via league_role
- INSERT:   Only authenticated users (they become founder)
- UPDATE:   Only founder OR league admin role
- DELETE:   Only founder OR league admin role
```

#### 3. League_Role Table Policies
```
- SELECT:   Members of the league OR admin
- INSERT:   League founder OR league admin
- UPDATE:   League founder OR league admin
- DELETE:   League founder OR league admin
```

#### 4. Guess Table Policies
```
- SELECT:   Own guesses OR league members viewing scoreboard
- INSERT:   Only self
- UPDATE:   Only self (before match starts)
- DELETE:   Only self (if before deadline)
```

#### 5. Match/Tournament/Team/Round Tables Policies
```
- SELECT:   All authenticated users (read-only)
- INSERT:   System/Admin only
- UPDATE:   System/Admin only
- DELETE:   System/Admin only
```

#### 6. Data_Provider_Executions Table Policies
```
- SELECT:   Admin only
- INSERT:   System/Admin only
- UPDATE:   System/Admin only
- DELETE:   Admin only
```

---

## Current Authentication & Authorization

### JWT Token Structure
```typescript
// From AuthMiddleware.ts
type AuthCookieContent = DB_SelectMember;

// Contains: id, email, nickName, role, ...
// Extracted from cookie and attached to req.authenticatedUser
```

### Request Context
```typescript
// Added by middleware to Express Request
req.authenticatedUser = {
  id: string;          // Member UUID
  nickName: string;
  role: 'member' | 'admin';
}
```

### Role Types

**Global Roles (member table):**
- `member` - Default user role
- `admin` - System administrator

**League Roles (league_role table):**
- (Values stored in TEXT column, need to verify available roles)
- Likely: `admin`, `member`, possibly `owner`

---

## Key Findings Summary

### Strengths
1. Clean domain-driven architecture
2. Proper foreign key relationships (mostly)
3. Audit fields (created_at, updated_at) on all tables
4. Composite keys used appropriately for unique constraints

### Gaps for RLS Implementation
1. **No RLS policies** - All access control is application-layer
2. **No database-level enforcement** - Malicious SQL queries could bypass rules
3. **Implicit relationships** - League membership via join, not explicit FK
4. **Admin role centralized** - Only one global admin role, no granular permissions
5. **No audit table** - No record of who made what changes when

### Data Flow for Key Operations

**User Creates League:**
1. Member authenticated via JWT
2. API creates league with founder_id = current user id
3. System creates league_role entry (founder as admin)
4. User can now add other members

**User Makes Guess:**
1. Member authenticated via JWT
2. Member selects tournament (must be in a league with that tournament)
3. API creates guess record with member_id = current user
4. Match scores updated by system later
5. Points calculated based on guess accuracy

**Admin Updates Match Scores:**
1. Lambda function fetches data from SofaScore API
2. Lambda updates match table with scores
3. System calculates points for all guesses on that match
4. Scoreboard updated for all leagues containing that tournament

---

## Next Steps for RLS Implementation

1. **Add Foreign Key Constraint** - Match table should reference league_role for guess validation
2. **Create RLS Enable Policies** - Enable RLS on sensitive tables
3. **Implement Row-Level Policies** - For each table per access pattern
4. **Add Audit Triggers** - To track modifications
5. **Create Service Role** - For system/Lambda function access
6. **Test Access Patterns** - Verify all application queries work through RLS

