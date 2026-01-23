# Walkthrough - Performance Domain Removal

I have successfully removed the `performance` domain from the codebase. This cleaner architecture removes the complexity of maintaining cached performance scores, though it temporarily disables leaderboards until a new solution is implemented (or if calculations are moved to on-the-fly).

## Changes

### 1. Deleted Performance Domain

- **Deleted Directory**: `src/domains/performance/` references and files are gone.

### 2. Database Schema

- **Tables Dropped**: `league_performance`, `tournament_performance`.
- **Migration Created**: `supabase/migrations/0006_lyrical_tinkerer.sql` contains the `DROP TABLE` statements.

### 3. Codebase Cleanup

References to performance were removed from:

- **League Domain**: Removed standings and performance tracking from `src/domains/league`.
- **Tournament Domain**:
  - Removed `getTournamentPerformanceForMember` endpoint.
  - Updated `checkOnboardingStatus` to simply check if a user has made any guesses in the tournament, instead of relying on a performance record.
- **Member Domain**: Removed performance summary endpoints (`getGeneralTournamentPerformance`, etc.).
- **Admin Domain**: Removed performance table cleanup in `maintenance.ts`.

## Verification Results

### compilation

- ran `yarn compile` -> **SUCCESS** (All types checked and valid).

### Database

- ran `yarn db:generate` -> **SUCCESS** (Migration file created reflecting the dropped tables).

## Next Steps

- Run `yarn db:migrate` to apply the changes to your local database.
- If you need leaderboards back, you will need to implement a new strategy (e.g., calculating on the fly from `T_Guess` or re-introducing a lighter weight caching mechanism).
