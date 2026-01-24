# Scoreboard Implementation Plan

## Phase 1: Infrastructure & Data Setup

### Goal
Establish the Redis infrastructure and ensure the Postgres schema supports the "Source of Truth" requirement.

### Tasks

#### Task 1.1 - Redis Setup & Configuration []
- [ ] Add `ioredis` dependency.
- [ ] Create `src/services/redis/client.ts` (Singleton pattern).
- [ ] Add Redis connection strings to `.env` and `src/config/env.ts`.
- [ ] Verify connection in `src/index.ts` (health check).

#### Task 1.2 - Postgres Schema Verification []
- [ ] Inspect `T_LeagueMember` or `T_TournamentMember`.
- [ ] Ensure a `points` column exists and is indexed.
- [ ] If missing, create a migration to add `points` (default 0).
- [ ] Create `DB_UpdatePoints` helper types/queries.

## Phase 2: The "Write" Path (Score Calculation)

### Goal
Implement the logic to calculate scores after a match and update both Postgres (Persist) and Redis (Cache).

### Tasks

#### Task 2.1 - Scoreboard Service (Core Logic) []
- [ ] Create `src/domains/score/services/scoreboard.service.ts`.
- [ ] Implement `calculateMatchPoints(matchId)`:
    -   Fetches guesses for the match.
    -   Runs `runGuessAnalysis`.
    -   Returns a map of `{ memberId: pointsDelta }`.

#### Task 2.2 - Redis Update Logic []
- [ ] Implement `updateTournamentMasterScore(tournamentId, memberDeltas)` in Scoreboard Service.
- [ ] Use `pipeline()` to execute `ZINCRBY` commands efficiently.

#### Task 2.3 - Postgres Persistence Logic []
- [ ] Implement `persistMemberPoints(tournamentId, memberDeltas)` in Scoreboard Service.
- [ ] Execute atomic `UPDATE` queries for reliability.

#### Task 2.4 - Orchestrator Integration []
- [ ] Modify `MatchUpdateOrchestrator` to call `ScoreboardService` after a match ends.

## Phase 3: The "Read" Path (League Views)

### Goal
Implement the logic to generate League-specific views and serve them via the API.

### Tasks

#### Task 3.1 - League Processor (Ranking) []
- [ ] Implement `refreshLeagueRanking(leagueId, tournamentId)`.
- [ ] Logic:
    -   `RENAME key -> key:prev` (Snapshot).
    -   `ZINTERSTORE` (Generate current view).

#### Task 3.2 - API Endpoint Implementation []
- [ ] Create `GET /api/v2/leagues/:id/scoreboard`.
- [ ] Implement `ZREVRANGE` for pagination.
- [ ] Implement `ZREVRANK` for "My Rank" & Movement calculation.

## Phase 4: Migration & Backfill

### Goal
Populate the new system with existing data so the scoreboard isn't empty.

### Tasks

#### Task 4.1 - Hydration Script []
- [ ] Create `scripts/hydrate-scoreboard.ts`.
- [ ] Logic:
    -   Iterate all past matches.
    -   Calculate total points for every user.
    -   Populate `T_TournamentMember.points`.
    -   Populate Redis `tournament:{id}:master_scores`.
    -   Populate Redis `league:{id}:members`.

## Dependencies
- Redis Server (local & production).
- Existing `runGuessAnalysis` logic.

## Expected Result
A fully functional, high-performance scoreboard API that updates automatically after matches.

## Next Steps
- Await user approval of this plan.
- Begin Phase 1.
