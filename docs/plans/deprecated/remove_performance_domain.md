# Implementation Plan - Remove Performance Domain

## Goal

Completely remove the `src/domains/performance` domain, including its database tables, services, and API endpoints. This involves cleaning up all references in other domains (`league`, `tournament`, `member`) that currently depend on performance data.

> [!WARNING] > **Breaking Change**: Removing this domain will break/disable features related to **League Standings**, **Tournament Leaderboards**, and **User Performance History**. These features rely on the `T_LeaguePerformance` and `T_TournamentPerformance` tables which will be dropped.

## User Review Required

- [ ] Confirm if the "Standings/Leaderboard" features should be completely removed or if they will be reimplemented later (this plan just removes them).
- [ ] Verify that we can drop `league_performance` and `tournament_performance` tables from the database.

## Proposed Changes

### 1. Services & Queries Cleanup

We need to remove usages of `performance` from other domains first to avoid build errors when we delete the files.

#### [League Domain]

- **`src/domains/league/services/index.ts`**
  - [DELETE] `getLeagueStandings` & `getLeaguePerformanceLastUpdated`.
  - [MODIFY] `createLeague`: Remove call to `QUERIES_LEAGUE.createLeaguePerformance`.
  - [MODIFY] `inviteToLeague`: Remove call to `QUERIES_LEAGUE.createLeaguePerformance`.
  - [MODIFY] Remove `QUERIES_PERFORMANCE` import.
- **`src/domains/league/queries/index.ts`**
  - [DELETE] `createLeaguePerformance`.
  - [MODIFY] Remove `T_LeaguePerformance` import.
- **`src/domains/league/api/index.ts`**
  - [MODIFY] Remove usage of `getLeagueStandings` (likely in a `getStandings` endpoint).

#### [Tournament Domain]

- **`src/domains/tournament/services/index.ts`**
  - [DELETE] `getTournamentPerformanceForMember`.
  - [MODIFY] `setupTournament`: Remove call to `QUERIES_TOURNAMENT.createTournamentPerformance`.
  - [MODIFY] `getTournamentStandings`: This likely relies on performance tables. It will need to be removed or stubbed to return empty.
- **`src/domains/tournament/queries/index.ts`**
  - [DELETE] `createTournamentPerformance`.
  - [DELETE] `getTournamentStandings` implementation that joins with `T_TournamentPerformance`.
  - [MODIFY] Remove `T_TournamentPerformance` import.
- **`src/domains/tournament/api/index.ts`** (and routes)
  - [MODIFY] Remove endpoints that expose performance data.

#### [Member Domain]

- **`src/domains/member/services/index.ts`**
  - [MODIFY] Remove calls to fetch member performance summaries/best & worst performance.

### 2. Database Schema

- **`src/services/database/schema.ts`**
  - [MODIFY] Remove `export * from '../../domains/performance/schema';`.

### 3. Delete Performance Domain

- **`src/domains/performance/`**
  - [DELETE] Entire directory.

### 4. Database Migration

- Run `yarn db:generate` to create a migration that drops `league_performance` and `tournament_performance` tables.

## Verification Plan

### Automated Tests

- Run `yarn compile` to check for specific TypeScript errors.
- Run `yarn test` to ensure no unit tests are failing due to missing imports.

### Manual Verification

- Verify the application starts (`yarn dev`).
- Check that `League` and `Tournament` creation flows still work (without creating performance entries).
