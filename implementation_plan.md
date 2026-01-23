# Implementation Plan - New Scoreboard System

## Problem

The `Performance` domain was removed. We need a way to show **Leaderboards** (Member rankings by points) without the complexity of the old system.
**Critical Finding**: The `T_Guess` table **does not store points**. It only stores the user's prediction (`1-0`). Points are currently calculated only in memory for single item analysis.

## Goal

Implement a scoring system that allows:

1.  Displaying a **Tournament Leaderboard**.
2.  Displaying a **League Leaderboard**.
3.  Efficiency (avoid recalculating every match for every user on every page load).

## Architecture Options

### Option 1: On-the-Fly Calculation (Pure SQL/Logic)

- **How**: Query `All Guesses` + `All Matches` -> Run `guess-analysis.ts` logic in memory -> Sort.
- **Pros**: Zero database redundancy. Always consistent.
- **Cons**: **Extremely slow at scale**. O(N*M). Computing 100 users * 380 matches = 38,000 checks per page load.
- **Verdict**: ❌ Too slow.

### Option 2: Denormalization (Add `points` to `T_Guess`)

- **How**: Add `points` (int) column to `T_Guess`.
- **Update Loop**: When `MatchUpdateOrchestrator` detects a match end -> Calculate points for all guesses on that match -> Update `T_Guess.points`.
- **Leaderboard Query**: `SELECT member_id, SUM(points) FROM guess JOIN match ... GROUP BY member_id`.
- **Pros**: Fast reads. Logical place for data (the grade belongs to the test).
- **Cons**: Need to backfill existing guesses.
- **Verdict**: ✅ **Recommended**. Best balance of simplicity and performance.

### Option 3: Aggregation Table (The "Old Way" Lite)

- **How**: Create a new table `T_Leaderboard` that stores just `{ memberId, tournamentId, totalPoints }`.
- **Pros**: Fastest reads.
- **Cons**: Synchronization nightmares (why does the leaderboard say 50 but my guesses sum to 45?). This is what we just deleted.
- **Verdict**: ⚠️ Risky.

## Proposed Plan (Option 2)

### Phase 1: Schema Change

- [ ] Add `points` (integer, nullable) to `T_Guess` table.
- [ ] Generate migration.

### Phase 2: Logic Implementation

- [ ] Create `ScoreService.calculatePoints(matchId)`:
  - Fetches all guesses for the match.
  - Runs `guess-analysis` logic.
  - Updates `T_Guess.points`.
- [ ] Hook into `MatchUpdateOrchestrator` (where we currently log "standings updated").

### Phase 3: Leaderboard API

- [ ] `GET /api/v2/tournaments/:id/leaderboard`: Simple SQL SUM query on `T_Guess`.

## User Review Required

- do you agree with **Option 2** (Adding `points` column to `T_Guess`)?
