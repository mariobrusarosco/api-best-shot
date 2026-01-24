# Scoreboard System Architecture

This document describes the technical architecture for the Scoreboard feature, incorporating Redis for high-performance ranking and an incremental update strategy, backed by PostgreSQL for persistence.

## 1. Core Architecture Principles

1.  **Tournament-Centric Calculation:** Scores are calculated once per tournament, not repeated per league.
2.  **Redis for Speed:** Redis `Sorted Sets (ZSET)` manage ranking, pagination, and "My Rank" lookups.
3.  **Postgres for Safety:** PostgreSQL remains the durable source of truth. Redis can be fully reconstructed from Postgres data.
4.  **Snapshot Strategy:** Rank movement is calculated by comparing "Current" vs "Previous" Redis keys.

## 2. Data Flow

The system transitions from "Match Update" to "Rank Update" only after a match is finalized.

```text
┌─────────────────────────────────────────────────────────────┐
│          Match Ends (MatchUpdateOrchestrator)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             JOB: ScoreboardUpdateOrchestrator               │
│  1. Identify all affected Members (those who guessed).      │
│  2. Calculate points delta for each member for this match.  │
│  3. Persist to Postgres (Durability):                       │
│     `UPDATE T_TournamentMember SET points = points + delta` │
│  4. Update Tournament Master Score in Redis (Speed):        │
│     `ZINCRBY tournament:{id}:master_scores {delta} {memberId}`│
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             JOB: LeagueRankingProcessor                     │
│  (Triggered per league associated with the tournament)      │
│                                                             │
│  1. Archive current ranks (Snapshotting):                   │
│     `RENAME league:{id}:leaderboard`                        │
│     `TO league:{id}:leaderboard:prev`                       │
│                                                             │
│  2. Generate new league ranks (Intersection):               │
│     `ZINTERSTORE league:{id}:leaderboard 2`                 │
│     `  tournament:{id}:master_scores league:{id}:members`   │
└─────────────────────────────────────────────────────────────┘
```

## 3. Data Models

### 3.1 The "Virtual League" Concept (Visualized)

We avoid writing scores 5 times for 5 leagues. We filter the Master list.

```text
  [ TOURNAMENT MASTER SCORES ]       [ LEAGUE MEMBER FILTER ]        [ RESULTING LEAGUE BOARD ]
  (ZSET: tournament:123:scores)      (SET: league:A:members)         (ZSET: league:A:leaderboard)

  ┌──────────────────────────┐       ┌────────────────────┐          ┌──────────────────────────┐
  │ User A ...... 150 pts    │       │ User A             │          │ 1. User A ...... 150 pts │
  │ User B ...... 140 pts    │   +   │ User C             │   ==>    │ 2. User C ...... 110 pts │
  │ User C ...... 110 pts    │       │                    │          └──────────────────────────┘
  │ User D ......  90 pts    │       └────────────────────┘             (User B & D are filtered out
  └──────────────────────────┘         (Intersection)                    because they are not in
                                                                           this specific league)
```

### 3.2 Redis Keys

| Key | Type | Description |
| :--- | :--- | :--- |
| `tournament:{id}:master_scores` | `ZSET` | **The Source.** Stores `memberId` -> `totalPoints`. |
| `league:{id}:members` | `SET` | List of `memberIds` belonging to the league. Managed when users join/leave. |
| `league:{id}:leaderboard` | `ZSET` | **Current View.** Subset of master scores, specific to this league. |
| `league:{id}:leaderboard:prev` | `ZSET` | **History.** Used to calculate rank movement. |

### 3.3 PostgreSQL Schema (Adjustments)

We need to ensure `T_TournamentMember` (or equivalent) tracks points effectively to serve as the backup.

```typescript
// Existing or Modified Table: T_MemberTournament (or T_LeagueMember)
{
  memberId: uuid,
  tournamentId: uuid,
  points: integer, // Total points. Source of Truth.
  // ... other fields
}
```

## 4. Read Path (API Strategy)

When `GET /api/v2/leagues/:id/scoreboard` is called:

### 4.1 Fetching the Leaderboard (Pagination)
Redis `ZREVRANGE` is O(log(N) + M).
```bash
# Get Top 25
ZREVRANGE league:{id}:leaderboard 0 24 WITHSCORES
```

### 4.2 Fetching "My Rank" & Movement

We determine movement by comparing the user's position in the `Current` list vs. the `Previous` list.

```text
       (Time T-1)                  (Time T: Update Job)                   (Time T+1)
  [ Previous Leaderboard ]       [ Master Score Update ]           [ Current Leaderboard ]
  
     1. User X (10pts)           User Y scores +5 pts!                1. User Y (13pts) ▲ 1
     2. User Y ( 8pts)        ──────────────────────────►             2. User X (10pts) ▼ 1
     3. User Z ( 5pts)                                                3. User Z ( 5pts) ─ 0

  Movement Calculation:
  User Y: (Prev Rank: 2) - (Curr Rank: 1) = +1 (Up 1 slot)
```

Redis `ZREVRANK` is O(log(N)).
```typescript
const currentRank = await redis.zrevrank(`league:${id}:leaderboard`, memberId);
const prevRank = await redis.zrevrank(`league:${id}:leaderboard:prev`, memberId);

// Rank is 0-indexed in Redis, so add 1 for display
const displayRank = currentRank + 1;

let movement = 0;
if (currentRank !== null && prevRank !== null) {
    // Example: Was 8, Now 5. Diff is 3 (Positive movement)
    movement = prevRank - currentRank; 
} else if (currentRank !== null && prevRank === null) {
    // New entrant
    movement = 'NEW';
}
```

## 5. Failure Recovery (Hydration)

If Redis data is lost (e.g., memory flush), the system must self-heal.

```text
  [ EMPTY REDIS ]             [ POSTGRESQL (Source of Truth) ]
       │                      (T_TournamentMember table)
       │                      ┌──────────────────────────┐
       │   1. Read All Rows   │ User A .... 150 pts      │
       │◄─────────────────────│ User B .... 140 pts      │
       │                      └──────────────────────────┘
       │
       ▼
  [ PIPELINE: ZADD ] 
  (Re-populating Master Scores)
       │
       ▼
  [ MASTER SCORES RESTORED ] ──► [ TRIGGER LEAGUE PROCESSORS ] ──► [ SYSTEM HEALTHY ]
```

**Hydration Job:**
1.  Read all rows from `T_MemberTournament` for the active tournament.
2.  Pipeline `ZADD` commands to recreate `tournament:{id}:master_scores`.
3.  Read all league memberships.
4.  Pipeline `SADD` commands to recreate `league:{id}:members`.
5.  Re-run the `LeagueRankingProcessor` logic to generate `league:{id}:leaderboard`.

## 6. Implementation Stages

1.  **Stage 1: Infrastructure:** Set up Redis instance and connection.
2.  **Stage 2: Write Path:** Implement `ScoreboardUpdateOrchestrator` to update Postgres & Redis on match end.
3.  **Stage 3: Read Path:** Implement the API endpoint to read from Redis.
4.  **Stage 4: Migration:** Script to calculate initial points for existing tournaments and populate Redis.
