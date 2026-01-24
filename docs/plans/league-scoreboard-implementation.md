# Scoreboard Implementation Plan

## Phase 1: Infrastructure & Data Setup

### Goal
Establish the Redis infrastructure and ensure the Postgres schema supports the "Source of Truth" requirement.

### Tasks

### Task 1.1 - Redis Infrastructure Setup []
#### Task 1.1.1 - Install Dependencies []
- [ ] Add `ioredis` to package.json.
- [ ] Add `@types/ioredis` (if needed) to devDependencies.

#### Task 1.1.2 - Redis Client Module []
- [ ] Create `src/services/redis/client.ts`.
- [ ] Implement Singleton pattern for the Redis client.
- [ ] Implement error handling (connection failures).

#### Task 1.1.3 - Configuration & Environment []
- [ ] Add `REDIS_URL` to `.env.example`.
- [ ] Add `REDIS_URL` to `src/config/env.ts` (with validation).
- [ ] Add `REDIS_URL` to `docker-compose.yml`.

#### Task 1.1.4 - Application Integration []
- [ ] Import and initialize Redis in `src/index.ts`.
- [ ] Add a simple startup log indicating Redis connection status.

### Task 1.2 - Postgres Schema Readiness []
#### Task 1.2.1 - Schema Analysis []
- [ ] Check `src/domains/tournament/schema/index.ts` (or `member/schema`).
- [ ] Verify if a table links Members to Tournaments (e.g., `T_LeagueTournament` or similar concept).

#### Task 1.2.2 - Schema Migration (if needed) []
- [ ] If `points` column is missing, create a Drizzle migration.
- [ ] Add `points` (integer, default 0, indexed) to the relevant linking table.
- [ ] Run `yarn db:generate` and `yarn db:migrate`.

#### Task 1.2.3 - Query Helpers []
- [ ] Create `DB_SelectMemberScore` and `DB_UpdateMemberScore` types.
- [ ] Add helper function `updateMemberPoints` in `queries/scoreboard.ts`.

## Phase 2: The "Write" Path (Score Calculation)

### Goal
Implement the logic to calculate scores after a match and update both Postgres (Persist) and Redis (Cache).

### Tasks

### Task 2.1 - Core Score Calculation Logic []
#### Task 2.1.1 - Service Shell []
- [ ] Create `src/domains/score/services/scoreboard.service.ts`.
- [ ] Define the interface for the `calculateMatchPoints` method.

#### Task 2.1.2 - Point Calculation Implementation []
- [ ] Implement logic to fetch all guesses for a specific `matchId`.
- [ ] Iterate through guesses and run `runGuessAnalysis` (existing logic).
- [ ] Aggregate results into a map: `Map<MemberId, PointsDelta>`.

### Task 2.2 - Redis "Master Score" Update []
#### Task 2.2.1 - Redis Helper Methods []
- [ ] Add `zIncrBy` wrapper in `src/services/redis/client.ts`.
- [ ] Add `pipeline` support.

#### Task 2.2.2 - Master Score Service Logic []
- [ ] Implement `updateMasterScores(tournamentId, deltas)` in `ScoreboardService`.
- [ ] Use Redis pipeline to batch `ZINCRBY` commands for the `tournament:{id}:master_scores` key.

### Task 2.3 - Postgres Persistence []
#### Task 2.3.1 - Database Update Logic []
- [ ] Implement `persistScoreDeltas(deltas)` in `ScoreboardService`.
- [ ] Loop through the map and execute `QUERIES.updateMemberPoints`.

### Task 2.4 - Orchestration Wiring []
#### Task 2.4.1 - Integration with Match Orchestrator []
- [ ] Open `MatchUpdateOrchestrator`.
- [ ] Locate the "Match Ended" event/block.
- [ ] Inject `ScoreboardService`.
- [ ] Call `calculateMatchPoints` -> `persist` -> `updateRedis` sequence.

## Phase 3: The "Read" Path (League Views)

### Goal
Implement the logic to generate League-specific views and serve them via the API.

### Tasks

### Task 3.1 - League Processor (Ranking) []
#### Task 3.1.1 - Snapshot Logic []
- [ ] Implement `snapshotCurrentLeaderboard(leagueId)`: `RENAME key -> key:prev`.

#### Task 3.1.2 - Intersection Logic []
- [ ] Implement `generateLeaderboard(leagueId, tournamentId)`: `ZINTERSTORE`.

#### Task 3.1.3 - Trigger Integration []
- [ ] Determine where to call this. (Likely immediately after the Orchestrator finishes the "Master Score" update).

### Task 3.2 - API Endpoint []
#### Task 3.2.1 - Route Definition []
- [ ] Add `GET /api/v2/leagues/:id/scoreboard` to `src/domains/league/routes`.

#### Task 3.2.2 - Controller Implementation []
- [ ] Create `getScoreboard` controller.
- [ ] Parse `page` and `limit` query params.

#### Task 3.2.3 - Service Implementation (Read) []
- [ ] Implement `getLeagueLeaderboard(leagueId, page, limit)`.
- [ ] Call Redis `ZREVRANGE`.
- [ ] Call Redis `ZREVRANK` for the requesting user.
- [ ] Calculate Rank Movement.

## Phase 4: Migration & Backfill

### Goal
Populate the new system with existing data.

### Tasks

### Task 4.1 - Backfill Script []
#### Task 4.1.1 - Script Shell []
- [ ] Create `scripts/hydrate-scoreboard.ts`.

#### Task 4.1.2 - Calculation Logic []
- [ ] Implement logic to iterate ALL past matches in the DB.
- [ ] Calculate total points from scratch for every user.

#### Task 4.1.3 - Execution []
- [ ] Run the script locally to verify.
- [ ] Verify Redis keys are populated.

## Dependencies
- Redis Server (local & production).
- Existing `runGuessAnalysis` logic.

## Expected Result
A fully functional, high-performance scoreboard API that updates automatically after matches.

## Next Steps
- Await user approval of this plan.
- Begin Phase 1.