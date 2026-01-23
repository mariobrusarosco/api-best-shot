# ADR 004: League Leaderboard Architecture

## Status
Accepted

## Context
The current application calculates user scores on-demand (`runGuessAnalysis`) whenever a score endpoint is accessed.
- **Current Flow**: Request -> Fetch Guesses -> Calculate in Memory -> Return.
- **Problem**: This approach is O(N*M) where N=Users and M=Matches. As the user base grows (simulating 100k+ users), generating a leaderboard for a league becomes computationally expensive and database-intensive, leading to high latency and potential server timeouts.

## Decision
We will implement a **"Materialized" Leaderboard** strategy using a dedicated PostgreSQL table (`T_LeagueLeaderboard`) and a **Background Worker Pattern** powered by `pg-boss`. This architecture decouples the cost of calculation from the speed of the read request.

### Scalable Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request (Users)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                             │
│         (Reads Only Pre-calculated Leaderboards)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                        │
│             [ T_LeagueLeaderboard (READ) ]                  │
└──────────┬──────────────────────▲───────────────────────────┘
           │                      │
           │ (Match Ends)         │ (Update Scores)
           ▼                      │
┌───────────────────────┐   ┌─────────────────────────────────┐
│   SCHEDULER SERVICE   │   │        WORKER SERVICE           │
│  (Match Update Job)   │   │  (Background Processing)        │
│                       │   │                                 │
│ 1. Update Match       │   │ 3. Pick Job: "Update League X"  │
│ 2. Publish Job ───────┼──►│ 4. Calculate Scores             │
└───────────────────────┘   │ 5. Upsert Leaderboard Table     │
                            └─────────────────────────────────┘
                                           ▲
                                           │
┌─────────────────────────────────────────────────────────────┐
│                      QUEUE LAYER                            │
│           (Abstracted Interface: IQueueProvider)            │
│                                                             │
│   [ Job: LEAGUE_UPDATE | matchId: 123 | leagueId: 456 ]     │
│                                                             │
│        Implementation: [ pg-boss ] OR [ Redis ]             │
└─────────────────────────────────────────────────────────────┘
```

### Selected Approach: Pre-calculated Table + Async Job Queue

#### 1. Schema Changes
New Table: `T_LeagueLeaderboard`
- `leagueId` (FK, UUID)
- `memberId` (FK, UUID)
- `totalPoints` (Integer)
- `rank` (Integer) - Calculated during the upsert process.
- `matchCount` (Integer) - Total matches guessed.
- `lastUpdatedAt` (Timestamp)
- **Constraint**: Unique on `(leagueId, memberId)`.

#### 2. Queue Abstraction Strategy
To ensure the system remains future-proof, we will define an `IQueueProvider` interface.
- **Current Implementation**: `pg-boss` (PostgreSQL-based).
- **Reasoning**: Superior reliability and transactional safety. Since the job and the result are in the same DB, we ensure "Exactly Once" processing or at least consistent state.
- **Future Path**: Can be swapped for Redis (BullMQ) or Kafka if performance requirements exceed Postgres capabilities.

#### 3. Update Mechanism (Fan-Out Pattern)
To handle 100k+ users without locking the database:
1.  **Trigger**: `MatchUpdateOrchestrator` detects a match status change to `ended`.
2.  **Step 1 (Fan-out)**: Scheduler identifies all leagues associated with the match's tournament.
3.  **Step 2 (Enqueuing)**: Scheduler enqueues one job per league: `QueueService.addJob('UPDATE_LEAGUE_LEADERBOARD', { leagueId, matchId })`.
4.  **Step 3 (Processing)**: Independent workers pick up league-specific jobs.
    - Workers recalculate scores for only that league's members.
    - Workers use **Delta Updates** (New Score = Old Score + New Points) to minimize DB reads.
    - Workers perform a `BATCH UPSERT` into `T_LeagueLeaderboard`.

#### 4. Read Mechanism
The API endpoint `GET /leagues/:id/leaderboard` will query the pre-calculated table.
- **Complexity**: O(N) where N is league size (typically small).
- **Latency**: Sub-10ms.


## Alternatives Considered

### Option A: Column in `T_Guess`
- **Idea**: Add `points` column to `T_Guess` and `SUM()` them on read.
- **Cons**: Still requires aggregation queries on every read. Performance degrades with table size.

### Option C: Redis Sorted Sets
- **Idea**: Use Redis `ZSET` for real-time ranking.
- **Cons**: Adds operational complexity. Risk of data loss if Redis persistence is not perfectly configured. `pg-boss` provides similar logic with higher reliability using existing infrastructure.

## Consequences

### Positive
- **Performance**: Leaderboard reads become instant and consistent.
- **Scalability**: Decouples read traffic from calculation cost. Heavy calculation happens only once per match end, in the background.
- **Simplicity**: Keeps the stack contained within PostgreSQL/Node.js.

### Negative
- **Data Duplication**: Scores are stored in two places (implicitly in `T_Guess` inputs and explicitly in `T_Leaderboard`).
- **Latency**: Leaderboards will lag slightly behind live match events (dependent on the 10-min scheduler), but this was agreed as acceptable.
