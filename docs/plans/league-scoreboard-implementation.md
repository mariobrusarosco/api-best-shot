# League Scoreboard Implementation Plan

## Goal
Implement a scalable, persistent League Scoreboard system that decouples score calculation from read requests. The system will use a background job queue (`pg-boss`) to process score updates asynchronously when matches end, ensuring the API remains fast and reliable even under high load.

## Phases

### Phase 1: Database Schema & Core Entities
**Goal**: Create the foundation for storing leaderboard data.

#### Tasks
- [ ] **Task 1.1: Create Leaderboard Schema**
    - [ ] Define `T_LeagueLeaderboard` table in Drizzle schema.
        - Columns: `id` (UUID), `leagueId` (FK), `memberId` (FK), `points` (Int), `rank` (Int), `matchCount` (Int), `lastUpdatedAt` (Timestamp).
        - Indexes: `leagueId` + `points` (DESC) for fast ranking.
        - Unique Constraint: `leagueId` + `memberId`.
    - [ ] Create `db:generate` migration file.
    - [ ] Run `db:migrate` to apply changes.

### Phase 2: Queue Infrastructure Abstraction
**Goal**: Implement the generic Queue Provider interface to decouple business logic from `pg-boss`.

#### Tasks
- [ ] **Task 2.1: Define Queue Interfaces**
    - [ ] Create `src/services/queue/types.ts`.
    - [ ] Define `IQueueProvider` interface (`addJob`, `processJob`).
    - [ ] Define Job Type constants (e.g., `JOB_UPDATE_LEAGUE_SCORE`).
- [ ] **Task 2.2: Implement pg-boss Provider**
    - [ ] Create `src/services/queue/providers/pg-boss.ts`.
    - [ ] Implement `IQueueProvider` using the existing `pg-boss` instance.
    - [ ] Ensure proper error handling and logging.
- [ ] **Task 2.3: Queue Factory**
    - [ ] Create `src/services/queue/index.ts` to export the singleton instance.

### Phase 3: Leaderboard Calculation Logic (The Worker)
**Goal**: Implement the logic that calculates scores and updates the database.

#### Tasks
- [ ] **Task 3.1: Create Leaderboard Service**
    - [ ] Create `src/domains/league/services/leaderboard.service.ts`.
    - [ ] Implement `calculateMemberScore(leagueId, memberId)`:
        - Fetch all guesses for the member in the league.
        - Run `runGuessAnalysis` for each.
        - Sum total points.
    - [ ] Implement `updateLeaderboard(leagueId)`:
        - Identify all members in the league.
        - Calculate scores for each.
        - Sort by points.
        - Bulk Upsert into `T_LeagueLeaderboard` with new ranks.
- [ ] **Task 3.2: Implement Job Worker**
    - [ ] Create `src/domains/league/workers/update-leaderboard.worker.ts`.
    - [ ] Define handler for `JOB_UPDATE_LEAGUE_SCORE`.
    - [ ] Extract `leagueId` or `matchId` from job data.
    - [ ] Call `LeaderboardService.updateLeaderboard`.

### Phase 4: Integration with Scheduler
**Goal**: Trigger the background jobs when real-world events happen.

#### Tasks
- [ ] **Task 4.1: Modify MatchUpdateOrchestrator**
    - [ ] In `src/domains/scheduler/services/match-update-orchestrator.service.ts`:
    - [ ] Locate logic where `match.status` changes to `'ended'`.
    - [ ] Find all tournaments/leagues associated with this match.
    - [ ] Call `QueueService.addJob(JOB_UPDATE_LEAGUE_SCORE, { leagueId })` for each affected league.

### Phase 5: API Endpoint (The Read Layer)
**Goal**: Expose the pre-calculated data to the frontend.

#### Tasks
- [ ] **Task 5.1: Create Endpoint**
    - [ ] Add `GET /leagues/:id/leaderboard` to `src/domains/league/routes/v2.ts`.
    - [ ] Implement Controller `getLeagueLeaderboard`.
    - [ ] Implement Service `getLeagueLeaderboard(leagueId)` that queries `T_LeagueLeaderboard`.
    - [ ] Return sorted list with generic user info (Nickname, Avatar).

### Phase 6: Testing & Verification
**Goal**: Ensure the entire pipeline works end-to-end.

#### Tasks
- [ ] **Task 6.1: Unit Tests**
    - [ ] Test `LeaderboardService` calculation logic.
    - [ ] Test `T_LeagueLeaderboard` upsert logic.
- [ ] **Task 6.2: Integration Test (End-to-End)**
    - [ ] Mock a "Match End" event.
    - [ ] Verify Job is created in `pgboss`.
    - [ ] Verify Worker picks up job.
    - [ ] Verify `T_LeagueLeaderboard` is updated.
    - [ ] Verify API returns correct data.

## Dependencies
- Existing `pg-boss` setup in `src/services/queue`.
- Existing `runGuessAnalysis` logic.

## Expected Result
- A scalable `GET /leaderboard` endpoint with <50ms latency.
- Background processing of scores.
- Architecture ready for high load.
