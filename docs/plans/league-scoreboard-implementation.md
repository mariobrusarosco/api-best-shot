# Scoreboard Implementation Plan (Revised)

## Phase 1: Foundation & Infrastructure (The Setup)

### Goal

Prepare the local and production environments to support Redis, and ensure the Postgres schema is ready to act as the durable "Source of Truth."

### Tasks

#### Task 1.1 - Redis Infrastructure (Local) [x]

- [x] **Dependencies:** Install `ioredis` (remove `@types/ioredis` if installed).
- [x] **Docker:** Update `docker-compose.yml` to include a `redis` service (Alpine image, exposed port 6379).
- [x] **Config:** Add `REDIS_URL` to `.env` (e.g., `redis://localhost:6379`).
- [x] **Verification:** Run `docker compose up -d` and connect via CLI to ping.

#### Task 1.2 - Redis Client & Resiliency [x]

- [x] **Client:** Create `src/services/redis/client.ts` as a robust Singleton.
- [x] **Error Handling:** Implement `retryStrategy` in the Redis client to handle temporary connection blips (crucial for Railway restarts).
- [x] **Health Check:** Integrate Redis ping into the app's startup sequence in `src/index.ts`.

#### Task 1.3 - Production Readiness (Railway) [x]

- [x] **Documentation:** Create `docs/guides/railway-redis-setup.md` documenting how to provision Redis in Railway.
- [x] **Env Validation:** Update `src/config/env.ts` to strictly validate `REDIS_URL` in production mode.

#### Task 1.4 - Postgres Source of Truth [x]

- [x] **Audit:** Inspect `src/domains/tournament/schema/index.ts` (specifically `T_LeagueTournament` or equivalent linking table).
- [x] **Migration:** If a direct `points` column is missing or insufficient, create a Drizzle migration to add it.
  - _Requirement:_ This column is the hard backup. If Redis dies, this saves us.
- [x] **Helpers:** Create `DB_AtomicUpdatePoints` type/query to ensure thread-safe increments (`points = points + delta`).

---

## Phase 2: The Core Services (Write Path)

### Goal

Implement the business logic that updates the "Source of Truth" (Postgres) first, and the "Hot Cache" (Redis) second.

### Tasks

#### Task 2.1 - Scoreboard Service (Delta Calculation) []

- [x] Create `src/domains/score/services/scoreboard.service.ts`.
- [x] Implement `calculateMatchPoints(matchId)`:
  - Fetches all guesses for the match.
  - Runs `runGuessAnalysis`.
  - Returns `Map<MemberId, PointsDelta>`.

#### Task 2.2 - The "Dual-Write" Transaction [x]
- [x] **Verification:** Write a test case that updates a user and checks BOTH Postgres and Redis.

#### Task 2.3 - Integration [x]
- [x] Hook into `MatchUpdateOrchestrator`: Call `applyScoreUpdates` immediately after a match status changes to 'ended'.

---

## Phase 3: The Recovery Engine (Hydration)

### Goal

Build the "Self-Healing" capability _before_ we build the Read API. We must assume Redis is empty on every deploy.

### Tasks

#### Task 3.1 - Hydration Service [x]

- [x] Create `src/services/scoreboard/hydration.service.ts`.
- [x] Implement `hydrateTournament(tournamentId)`:
  - **Step 1:** Fetch ALL member point totals from Postgres (`T_TournamentMember`).
  - **Step 2:** Pipeline `ZADD` to overwrite `tournament:{id}:master_scores`.
  - **Step 3:** Fetch ALL league memberships.
  - **Step 4:** Pipeline `SADD` to overwrite `league:{id}:members`.

#### Task 3.2 - The "Reset" Switch [x]

- [x] Implement a logic check: `isRedisHealthy(tournamentId)`.
- [x] Create a CLI script `scripts/hydrate-redis.ts` that invokes the service.
- [x] **Verification:** Manually flush Redis, run the script, and verify keys are back.

---

## Phase 4: The Read Path (League Processor)

### Goal

Implement the "Virtual League" views and the "Tick-Tock" rank movement logic.

### Tasks

#### Task 4.1 - League Processor (The Filter) []

- [ ] Implement `refreshLeagueRanking(leagueId, tournamentId)`:
  - **Snapshot:** `RENAME league:{id}:leaderboard` -> `league:{id}:leaderboard:prev`.
  - **Generate:** `ZINTERSTORE league:{id}:leaderboard 2 tournament:{id}:master_scores league:{id}:members`.
  - _Note:_ Handle the case where the key doesn't exist (first run).

#### Task 4.2 - API Implementation []

- [ ] **Route:** `GET /api/v2/leagues/:id/scoreboard`.
- [ ] **Pagination:** Use `ZREVRANGE` (Top N).
- [ ] **My Rank:** Use `ZREVRANK` on Current and Previous keys.
- [ ] **Movement:** Calculate `PrevRank - CurrentRank`.

---

## Phase 5: Verification & Deployment

### Goal

Final safety checks before shipping.

### Tasks

#### Task 5.1 - Local Simulation []

- [ ] Simulate a "Match End" event locally.
- [ ] Verify: Postgres Updated? Redis Master Updated? League View Refreshed? Rank Moved?

#### Task 5.2 - Deployment Config []

- [ ] Ensure Railway `Redis` service is provisioned.
- [ ] Set `REDIS_URL` in Railway variables.
- [ ] (Optional) Add a `post-deploy` command to run the Hydration script if needed.

## Dependencies

- Redis Instance.
- Postgres Database.

## Expected Result

A resilient, high-performance scoreboard that prioritizes data safety (Postgres) while delivering speed (Redis).
