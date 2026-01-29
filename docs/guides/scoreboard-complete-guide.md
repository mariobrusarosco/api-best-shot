# Scoreboard System - Complete Guide

## Table of Contents
1. [Overview & Requirements](#1-overview--requirements)
2. [System Architecture](#2-system-architecture)
3. [Streaming Implementation](#3-streaming-implementation)
4. [API Usage](#4-api-usage)
5. [Operations & Monitoring](#5-operations--monitoring)
6. [Quick Reference](#6-quick-reference)

---

## 1. Overview & Requirements

### Purpose

The Scoreboard system displays real-time rankings for league members based on their prediction accuracy. It supports:
- Up to 10,000 users per league
- Post-match score updates (not live during matches)
- Rank tracking with movement indicators
- High-performance leaderboard queries

### Core Requirements

#### 1.1 Update Frequency ("Liveness")

**When do scores update?**
- Scores update **only after a match ends**
- Handled by the existing Scheduler service
- Not live during matches (no goal-by-goal updates)

#### 1.2 Infrastructure

**Available technologies:**
- PostgreSQL (durability, source of truth)
- Redis (speed, sorted sets for rankings)
- Node.js with Drizzle ORM

#### 1.3 Rank Precision

**Ranking requirements:**
- Exact rank required (e.g., "Rank: #12,405")
- No approximations or tiers
- League size capped at 10,000 users maximum

#### 1.4 Scale Targets

| Metric | Limit |
|--------|-------|
| Max users per league | 10,000 |
| Global users | None (private leagues only) |
| Concurrent match updates | 10 |
| API latency (P99) | < 100ms |
| Score propagation delay | < 30 seconds |

#### 1.5 Rank Movement

**Movement tracking:**
- Display rank changes (▲ 3 places, ▼ 2 places, ─ no change)
- Requires historical snapshot comparison
- Calculated on-read using Redis ZSET

### Technical Constraints

**Challenges:**
- **Write amplification:** One match affects multiple leagues
- **Memory safety:** Must handle 1M guesses without OOM
- **Deep pagination:** OFFSET 5000 is slow in SQL
- **Concurrency:** Score updates while users read board

**Solutions:**
- Tournament-centric calculation (calculate once, filter by league)
- Streaming/batching for memory safety
- Redis ZSET for pagination (O(log(N) + M))
- Atomic operations for concurrent safety

---

## 2. System Architecture

### Architecture Evolution

#### V1: Synchronous Processing (Initial)

```
Match Ends → Calculate Points (Blocking) → Update DB → Return
             ↑ Problem: Blocks API for 3.5s with 1M users
             ↑ Problem: Loads all guesses into memory (OOM risk)
```

**Limitations:**
- Synchronous calculation blocks event loop
- Memory pressure (500MB for 1M guesses)
- No failure isolation (crash kills orchestrator)
- Not scalable beyond 100k users

#### V2: Async Worker Model (Current)

```
Match Ends → Enqueue Job → Worker Processes → Update DB + Redis
             ↑ Non-blocking          ↑ Streaming
             ↑ Durable queue         ↑ Constant memory
```

**Improvements:**
- Asynchronous processing via queue
- Streaming prevents memory issues
- Isolated workers (failures don't affect scheduler)
- Scalable to 1M+ users

### Core Architecture Principles

1. **Tournament-Centric Calculation:** Calculate scores once per tournament, not per league
2. **Redis for Speed:** Sorted Sets (ZSET) manage rankings, pagination, "My Rank"
3. **PostgreSQL for Safety:** Durable source of truth, Redis reconstructable from it
4. **Snapshot Strategy:** Rank movement via current vs previous comparison

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│          Match Ends (MatchUpdateOrchestrator)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             JOB: ScoreboardUpdateOrchestrator               │
│  1. Identify all affected members (those who guessed)       │
│  2. Calculate points delta (STREAMING - memory safe)        │
│  3. Persist to PostgreSQL (durability):                     │
│     `UPDATE T_TournamentMember SET points = points + delta` │
│  4. Update Tournament Master Score in Redis (speed):        │
│     `ZINCRBY tournament:{id}:master_scores {delta} {memberId}`│
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             JOB: LeagueRankingProcessor                     │
│  (Triggered per league associated with the tournament)      │
│                                                             │
│  1. Archive current ranks (snapshotting):                   │
│     `RENAME league:{id}:leaderboard`                        │
│     `TO league:{id}:leaderboard:prev`                       │
│                                                             │
│  2. Generate new league ranks (intersection):               │
│     `ZINTERSTORE league:{id}:leaderboard 2`                 │
│     `  tournament:{id}:master_scores league:{id}:members`   │
└─────────────────────────────────────────────────────────────┘
```

### The "Virtual League" Concept

We avoid writing scores 5 times for 5 leagues by filtering the master list:

```
  [ TOURNAMENT MASTER SCORES ]       [ LEAGUE MEMBER FILTER ]        [ RESULTING LEAGUE BOARD ]
  (ZSET: tournament:123:scores)      (SET: league:A:members)         (ZSET: league:A:leaderboard)

  ┌──────────────────────────┐       ┌────────────────────┐          ┌──────────────────────────┐
  │ User A ...... 150 pts    │       │ User A             │          │ 1. User A ...... 150 pts │
  │ User B ...... 140 pts    │   +   │ User C             │   ==>    │ 2. User C ...... 110 pts │
  │ User C ...... 110 pts    │       │                    │          └──────────────────────────┘
  │ User D ......  90 pts    │       └────────────────────┘             (User B & D filtered out
  └──────────────────────────┘         (Intersection)                    - not in this league)
```

### Data Models

#### Redis Keys

| Key | Type | Description |
|-----|------|-------------|
| `tournament:{id}:master_scores` | ZSET | **Source.** Stores `memberId` → `totalPoints` |
| `league:{id}:members` | SET | List of `memberIds` in league |
| `league:{id}:leaderboard` | ZSET | **Current view.** Subset of master scores for this league |
| `league:{id}:leaderboard:prev` | ZSET | **History.** For rank movement calculation |

#### PostgreSQL Schema

```typescript
// T_TournamentMember (or T_MemberTournament)
{
  memberId: uuid,
  tournamentId: uuid,
  points: integer,        // Total points. Source of Truth.
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Queue System

**Technology Choice:**
- **pg-boss** (current): PostgreSQL-based, no extra infrastructure
- **BullMQ** (future): Redis-based, higher throughput

**Queue Configuration:**
- Queue name: `calculate-scoreboard`
- Workers: Dedicated worker process
- Retry: 3 attempts with exponential backoff
- Processing: Streaming to prevent memory issues

---

## 3. Streaming Implementation

### The Problem: Memory Safety

#### Without Streaming (V1)

```typescript
// ❌ Loads ALL guesses into memory
const allGuesses = await db
  .select()
  .from(T_Guess)
  .where(eq(T_Guess.matchId, matchId));

// Memory usage: 1M guesses × 500 bytes = 500MB
// Result: OOM CRASH on 512MB container
```

**What happens:**
```
Database: SELECT * FROM T_Guess WHERE matchId = 'x'
  ↓
Load 1,000,000 rows into memory
  ↓
Memory: 500MB peak
  ↓
❌ OUT OF MEMORY (container crashes)
```

#### With Streaming (V2)

```typescript
// ✅ Processes in batches of 1,000
for await (const batch of streamGuessesInBatches(matchId, 1000)) {
  // Process only 1,000 guesses at a time
  // Memory: 500KB constant regardless of total size
}
```

**What happens:**
```
Round 1: Load 1,000 guesses → Process → Free memory (500KB)
Round 2: Load 1,000 guesses → Process → Free memory (500KB)
Round 3: Load 1,000 guesses → Process → Free memory (500KB)
...continues...
Peak Memory: 500KB (constant!)
```

### How Streaming Works

#### Keyset Pagination

```typescript
async function* streamGuessesInBatches(
  matchId: string,
  batchSize: number = 1000
): AsyncGenerator<Guess[], void, unknown> {
  let lastId: string | null = null;

  while (true) {
    const batch = await db
      .select()
      .from(T_Guess)
      .where(
        and(
          eq(T_Guess.matchId, matchId),
          lastId ? gt(T_Guess.id, lastId) : undefined  // WHERE id > lastId
        )
      )
      .orderBy(T_Guess.id)
      .limit(batchSize);

    if (batch.length === 0) break;

    yield batch;
    lastId = batch[batch.length - 1].id;
  }
}
```

**Query execution:**

```sql
-- Iteration 1
SELECT * FROM "T_Guess"
WHERE match_id = 'match-123'
ORDER BY id
LIMIT 1000;
-- Returns: IDs 1-1000, lastId = 1000

-- Iteration 2
SELECT * FROM "T_Guess"
WHERE match_id = 'match-123'
  AND id > '1000'  -- ← Keyset condition
ORDER BY id
LIMIT 1000;
-- Returns: IDs 1001-2000, lastId = 2000

-- Iteration 3
SELECT * FROM "T_Guess"
WHERE match_id = 'match-123'
  AND id > '2000'
ORDER BY id
LIMIT 1000;
-- Returns: IDs 2001-3000, lastId = 3000
```

### Memory Comparison

| Scenario | V1 (Load All) | V2 (Streaming) | Improvement |
|----------|---------------|----------------|-------------|
| 10k guesses | 5MB | 500KB | 10x less |
| 100k guesses | 50MB (risky) | 500KB | 100x less |
| 1M guesses | 500MB (crash) | 500KB | 1000x less |

### Performance Trade-offs

**Speed comparison (100k guesses):**
- V1: 1 query, 8 seconds total
- V2: 100 queries, 12 seconds total (+4 seconds overhead)

**Why V2 is slightly slower:**
- Multiple database queries (100 vs 1)
- Network overhead per query
- Query planning overhead

**Why overhead is acceptable:**
- 4-second delay vs container crash
- Scalable to unlimited size
- Prevents production outages

### Batch Size Tuning

| Batch Size | Memory/Batch | Queries (100k) | Trade-off |
|------------|--------------|----------------|-----------|
| 500 | 250KB | 200 | Very safe, slower |
| 1,000 | 500KB | 100 | **Recommended** |
| 2,000 | 1MB | 50 | Faster, more memory |
| 5,000 | 2.5MB | 20 | Risky for large scale |

**Configuration:**
```bash
# .env
SCOREBOARD_BATCH_SIZE=1000  # Default recommended
```

---

## 4. API Usage

### Endpoint

```
GET /api/v2/leagues/:leagueId/scoreboard
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Pagination page number |
| `limit` | number | 25 | Items per page |

### Response Format

```json
{
  "data": [
    {
      "memberId": "uuid-string",
      "points": 150,
      "rank": 1
    },
    {
      "memberId": "uuid-string",
      "points": 145,
      "rank": 2
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 500
  },
  "myStats": {
    "rank": 15,
    "points": 80,
    "movement": 3
  }
}
```

### Response Fields

**data** (array):
- `memberId`: User identifier
- `points`: Total points in tournament
- `rank`: Current position (1-indexed)

**meta** (object):
- `page`: Current page number
- `limit`: Items per page
- `total`: Total members in league

**myStats** (object, optional):
- Only returned if requesting user is league member
- `rank`: User's current rank
- `points`: User's total points
- `movement`: Rank change since last update
  - **Positive (+3):** Moved UP 3 places (improved)
  - **Negative (-2):** Moved DOWN 2 places (worsened)
  - **Zero (0):** No change or new entry

### Implementation: Fetching Leaderboard

```typescript
// Get top 25 (pagination)
const leaderboard = await redis.zrevrange(
  `league:${leagueId}:leaderboard`,
  0,
  24,
  'WITHSCORES'
);
// Complexity: O(log(N) + M) where M = 25
```

### Implementation: Fetching "My Rank" & Movement

```typescript
const currentRank = await redis.zrevrank(
  `league:${id}:leaderboard`,
  memberId
);

const prevRank = await redis.zrevrank(
  `league:${id}:leaderboard:prev`,
  memberId
);

// Redis returns 0-indexed, add 1 for display
const displayRank = currentRank + 1;

let movement = 0;
if (currentRank !== null && prevRank !== null) {
  // Was 8, Now 5. Diff is 3 (Positive movement = UP)
  movement = prevRank - currentRank;
} else if (currentRank !== null && prevRank === null) {
  movement = 'NEW';  // New entrant
}
```

**Movement calculation example:**
```
(Time T-1)                  (Time T: Update)                   (Time T+1)
[ Previous ]                [ Master Score Update ]            [ Current ]

1. User X (10pts)           User Y scores +5 pts!              1. User Y (13pts) ▲ 1
2. User Y ( 8pts)        ──────────────────────────►           2. User X (10pts) ▼ 1
3. User Z ( 5pts)                                              3. User Z ( 5pts) ─ 0

Movement: User Y: (Prev: 2) - (Curr: 1) = +1 (Up 1 slot)
```

### Integration Tips

1. **Polling frequency:**
   - Scoreboard updates ~1 minute after match ends
   - No need for aggressive polling
   - Recommended: Poll every 30-60 seconds during active matches

2. **Infinite scroll:**
   - Use `meta.total` to determine if more pages exist
   - Calculate: `hasMore = (page * limit) < total`

3. **Real-time updates:**
   - Not supported (scores update post-match only)
   - Consider WebSocket for future live features

4. **Caching:**
   - Redis cache updated automatically
   - Client-side caching safe for 30-60 seconds

---

## 5. Operations & Monitoring

### Failure Recovery (Hydration)

If Redis data is lost, the system self-heals from PostgreSQL:

```
[ EMPTY REDIS ]             [ POSTGRESQL (Source of Truth) ]
     │                      (T_TournamentMember table)
     │                      ┌──────────────────────────┐
     │   1. Read All Rows   │ User A .... 150 pts      │
     │◄─────────────────────│ User B .... 140 pts      │
     │                      └──────────────────────────┘
     │
     ▼
[ PIPELINE: ZADD ]
(Re-populate Master Scores)
     │
     ▼
[ MASTER RESTORED ] ──► [ TRIGGER LEAGUE PROCESSORS ] ──► [ SYSTEM HEALTHY ]
```

**Hydration job:**
1. Read all rows from `T_MemberTournament` for active tournament
2. Pipeline `ZADD` commands to recreate `tournament:{id}:master_scores`
3. Read all league memberships
4. Pipeline `SADD` commands to recreate `league:{id}:members`
5. Re-run `LeagueRankingProcessor` to generate `league:{id}:leaderboard`

### Performance Monitoring

**Key metrics:**

**Write Path:**
- Fetch time (PostgreSQL): Target < 50ms
- Calculation time (Node.js): Target < 20ms
- Update time (Redis ZINCRBY): < 10ms

**Read Path:**
- Ranking time (ZINTERSTORE): < 100ms for 10k members
- Read time (ZREVRANK/ZREVRANGE): < 5ms

**Memory:**
- Stream batch processing: 500KB constant
- Redis storage: ~1MB per 10k members
- Total Redis: < 1GB for 1000 leagues

### Scalability Analysis

**Write throughput:**
- Processing 5,000 guesses: < 70ms total
- Concurrent matches: 10 simultaneous updates supported
- No event loop blocking

**Read performance:**
- ZINTERSTORE: O(N log(N)) - fast in Redis memory
- ZREVRANK: O(log(N)) - instant lookups
- ZREVRANGE: O(log(N) + M) - efficient pagination

**Storage efficiency:**
- 10,000 members in ZSET: ~1MB
- 1,000 leagues: ~1GB RAM total
- Very cost-effective

### Common Issues

**Issue: Scoreboard not updating after match end**

*Diagnosis:*
```bash
# Check queue
redis-cli
> LLEN pgboss:job:calculate-scoreboard

# Check job status
SELECT * FROM pgboss.job
WHERE name = 'calculate-scoreboard'
ORDER BY createdon DESC LIMIT 5;
```

*Solution:* Verify scheduler triggered scoreboard job, check worker logs

**Issue: Memory spike during processing**

*Diagnosis:* Check if streaming is enabled
*Solution:* Verify `SCOREBOARD_V2_ENABLED=true` in environment

**Issue: Rank movement incorrect**

*Diagnosis:* Check if previous snapshot exists
```bash
redis-cli
> EXISTS league:{id}:leaderboard:prev
```

*Solution:* Snapshots created on first update after enable

---

## 6. Quick Reference

### 🚀 Common Commands

**Redis operations:**
```bash
# View tournament scores
redis-cli ZREVRANGE tournament:123:master_scores 0 -1 WITHSCORES

# View league leaderboard
redis-cli ZREVRANGE league:456:leaderboard 0 24 WITHSCORES

# Get user rank
redis-cli ZREVRANK league:456:leaderboard user-uuid

# Check league members
redis-cli SMEMBERS league:456:members
```

**Database queries:**
```sql
-- Check tournament points
SELECT "memberId", points
FROM "T_TournamentMember"
WHERE "tournamentId" = 'tournament-uuid'
ORDER BY points DESC
LIMIT 25;

-- Verify scoreboard job status
SELECT * FROM pgboss.job
WHERE name = 'calculate-scoreboard'
  AND state = 'failed';
```

### ⚙️ Environment Variables

| Variable | Required | Default | Purpose |
|----------|:--------:|---------|---------|
| `REDIS_URL` | ✅ | - | Redis connection for scoreboards |
| `SCOREBOARD_V2_ENABLED` | ✅ | `false` | Enable async worker mode |
| `SCOREBOARD_BATCH_SIZE` | ⬜ | `1000` | Streaming batch size |

### 🚨 Emergency Procedures

**Redis data loss:**
```bash
# Run hydration script
node scripts/hydrate-scoreboard.js --tournament=<id>
```

**Scoreboard stuck:**
```bash
# Clear and rebuild
redis-cli DEL league:{id}:leaderboard
redis-cli DEL league:{id}:leaderboard:prev

# Trigger rebuild via API
curl -X POST /api/v2/admin/scoreboard/rebuild \
  -H "Authorization: Bearer TOKEN" \
  -d '{"tournamentId": "xxx"}'
```

### 📊 Health Indicators

**✅ Healthy system:**
- Redis keys exist for active leagues
- Job completion rate > 95%
- API latency < 100ms
- Memory usage < 600MB

**⚠️ Warning signs:**
- Job failure rate > 5%
- Missing Redis keys
- API latency 100-200ms

**🔴 Critical issues:**
- Redis connection failed
- Job failure rate > 10%
- Memory usage > 800MB
- API timeouts

### 📈 Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| Fetch 5k guesses | < 50ms | ~40ms |
| Calculate points | < 20ms | ~15ms |
| Update Redis ZINCRBY | < 10ms | ~5ms |
| Read leaderboard (25) | < 5ms | ~2ms |
| Get user rank | < 5ms | ~1ms |
| ZINTERSTORE (10k) | < 100ms | ~50ms |

### 🔍 Troubleshooting Checklist

- [ ] Verify Redis connection: `redis-cli PING`
- [ ] Check queue workers running: `ps aux | grep worker`
- [ ] Verify scoreboard jobs queued: `SELECT COUNT(*) FROM pgboss.job WHERE name = 'calculate-scoreboard'`
- [ ] Check Redis memory: `redis-cli INFO memory`
- [ ] Verify PostgreSQL points synced: Compare with Redis scores
- [ ] Check API endpoint responding: `curl /api/v2/leagues/:id/scoreboard`

### 📚 Related Documentation

- **Scheduler:** See `/docs/guides/scheduler-complete-guide.md` for match update automation
- **Queue System:** See `/docs/guides/job-queues-with-pgboss.md` for pg-boss concepts
- **Database:** See `/docs/guides/database-complete-guide.md` for schema and migrations

---

**Document Version:** 1.0
**Created:** January 29, 2026
**Last Updated:** January 29, 2026
**Status:** Current

**Changelog:**
- **v1.0 (Jan 29, 2026):** Unified documentation from scoreboard-api-usage, scoreboard-streaming-explained, and scoreboard-system-design files