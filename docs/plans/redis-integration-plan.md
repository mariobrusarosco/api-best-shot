# Redis Integration Plan

Status: Draft
Date: March 11, 2026
Owner: Backend

## Context

**Local dev:** Redis container already exists in `docker-compose.yml` (`redis:alpine`, port 6379) and `REDIS_URL` is defined in `.env.example`. No application code connects to Redis yet.

**Remote envs:** No `REDIS_URL` in remote env templates (`.env.demo.example`, `.env.staging.example`, `.env.production.example`). Railway currently runs 2 services per environment: `api-best-shot` and `api-best-shot-scheduler`. A previous attempt to add Redis on Railway failed and was removed — root cause unknown.

### Key Architectural Insight

Each phase below is **independently deployable** to production in any order.
The only hard prerequisite is Phase 0 (foundation), which must land first.
All cache layers include a graceful fallback — if Redis is down, the API continues to work by hitting PostgreSQL directly.

---

# Phase 0 — Redis Foundation

## Goal

Create a reusable Redis client service that all future phases depend on.
Follows the same shared-service pattern as `src/core/database/` and `src/core/logger/`.

## Tasks

### Task 0.1 — Install `ioredis` dependency []

- `yarn add ioredis`
- `ioredis` is the standard Node.js Redis client (reconnection, pipelining, Sentinel/Cluster support built-in)

### Task 0.2 — Create `src/core/redis/index.ts` []

#### Task 0.2.a — Redis client singleton with lazy connection []

- Read `REDIS_URL` from env (default: `redis://localhost:6379`)
- Expose `getRedisClient()` that returns the singleton
- On connection error: log via `Logger`, do NOT crash the app

#### Task 0.2.b — Create `src/core/redis/cache.ts` utility []

- `cacheGet<T>(key: string): Promise<T | null>` — get + JSON.parse, returns null on miss or Redis failure
- `cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void>` — JSON.stringify + SETEX
- `cacheInvalidate(pattern: string): Promise<void>` — delete by key or pattern
- Every function wraps in try/catch — on Redis failure, returns null/void (graceful degradation)

#### Task 0.2.c — Create `src/core/redis/constants.ts` []

- Cache key prefix constants per domain: `CACHE_KEYS.TOURNAMENT`, `CACHE_KEYS.MATCH`, `CACHE_KEYS.STANDINGS`, `CACHE_KEYS.DASHBOARD`
- TTL constants: `CACHE_TTL.SHORT` (60s), `CACHE_TTL.MEDIUM` (300s), `CACHE_TTL.LONG` (3600s), `CACHE_TTL.STATIC` (86400s)

### Task 0.3 — Add `REDIS_URL` to remote env templates []

#### Task 0.3.a — Update `.env.demo.example` with `REDIS_URL` []
#### Task 0.3.b — Update `.env.staging.example` with `REDIS_URL` []
#### Task 0.3.c — Update `.env.production.example` with `REDIS_URL` []

### Task 0.4 — Provision Redis on Railway []

**Context:** A previous attempt to add Redis on Railway failed and was removed.
Common Railway Redis failure causes:
- Private networking misconfiguration (internal URL vs public URL)
- The service referencing `REDIS_URL` before the add-on finished provisioning
- Redis add-on linked to one service but not the other

Strategy: validate locally first (Phase 0.1–0.3 + 0.5), then add Railway Redis with a safe rollout.

#### Task 0.4.a — Add Redis add-on to Railway demo environment []

- In Railway dashboard: click `+ Add` → `Database` → `Redis`
- This creates a third service alongside `api-best-shot` and `api-best-shot-scheduler`
- Railway generates connection variables automatically: `REDIS_URL`, `REDIS_PRIVATE_URL`, etc.

#### Task 0.4.b — Link Redis to both services []

- In Railway dashboard, go to `api-best-shot` → Variables → Reference Variables
- Add `REDIS_URL` referencing `${{Redis.REDIS_URL}}` (public) or `${{Redis.REDIS_PRIVATE_URL}}` (private networking)
- Repeat for `api-best-shot-scheduler`
- **Important:** Use `REDIS_PRIVATE_URL` if both services and Redis are in the same Railway project (lower latency, no egress cost). Use `REDIS_URL` (public) only if private networking doesn't work.

#### Task 0.4.c — Verify connectivity before deploying app changes []

- Deploy the current codebase (without any Redis application code) to confirm Railway services still start fine with the Redis add-on present
- Then deploy the Phase 0 code (which includes graceful fallback) — if `REDIS_URL` resolves, it connects; if not, the app runs without cache
- This decouples "infrastructure provisioning" from "application code deployment"

#### Task 0.4.d — If Railway Redis fails again, document the error []

- The graceful fallback in the application code means the API works without Redis
- If Railway Redis fails, we can still run Phases 1-5 locally and in CI, and investigate the Railway issue separately
- Create a fixing-log entry in `docs/fixing-log/` if needed

### Task 0.5 — Startup verification []

- On app boot (in `src/apps/api/index.ts`), call a `verifyRedisConnection()` function
- Log success/failure via `Logger` (same pattern as the existing DB verification)
- App must NOT crash if Redis is unreachable

## Dependencies

- `ioredis` package
- Railway Redis add-on (for remote environments)

## Expected Result

- Redis client available as a shared service at `src/core/redis/`
- Graceful degradation: if Redis is down, the API runs normally (just without caching)
- Env templates updated for all environments
- Ready for any Phase 1-5 to plug in

## Next Steps

Pick any of Phase 1 through Phase 5 in whichever order you want.

---

# Phase 1 — Tournament & Standings Cache

## Goal

Cache the most-read, least-changed data: tournament list, tournament details, and standings.
These power the Tournaments page and the standings table on every tournament detail page.

## Tasks

### Task 1.1 — Cache `getAllTournaments` []

#### Task 1.1.a — Wrap service method with cache-aside pattern []

- Key: `tournaments:all`
- TTL: `CACHE_TTL.STATIC` (24h) — tournaments are created by admin, almost never changes
- On cache miss: query DB, store result, return
- On cache hit: return cached data

#### Task 1.1.b — Invalidate on `createTournament` []

- After `QUERIES_TOURNAMENT.createTournament()`, call `cacheInvalidate('tournaments:all')`

### Task 1.2 — Cache `getTournament` / `getTournamentDetails` []

#### Task 1.2.a — Wrap service method with cache-aside pattern []

- Key: `tournaments:{tournamentId}`
- TTL: `CACHE_TTL.LONG` (1h)
- Note: `getTournamentRounds` and `getTournamentStandings` also call `tournament(id)` internally — caching here benefits multiple downstream methods

#### Task 1.2.b — Invalidate when data-provider updates tournament []

- In `TournamentDataProvider.updateOnDatabase()` and `persistCurrentRound()`, invalidate `tournaments:{tournamentId}`

### Task 1.3 — Cache `getTournamentStandings` []

#### Task 1.3.a — Wrap service method with cache-aside pattern []

- Key: `standings:{tournamentId}`
- TTL: `CACHE_TTL.MEDIUM` (5min) — standings update when scraper runs but are viewed heavily
- Cache the **parsed** result (after `parseStandingsByMode`), not the raw DB rows — avoids re-parsing on every hit

#### Task 1.3.b — Invalidate when data-provider updates standings []

- In `StandingsDataProviderService.updateOnDatabase()`, invalidate `standings:{tournamentId}`

### Task 1.4 — Cache `getTournamentRounds` []

#### Task 1.4.a — Wrap service method with cache-aside pattern []

- Key: `rounds:{tournamentId}`
- TTL: `CACHE_TTL.LONG` (1h) — rounds change rarely (new knockout rounds discovered)

#### Task 1.4.b — Invalidate when data-provider updates rounds []

- In `RoundsDataProviderService` after `upsertTournamentRounds`, invalidate `rounds:{tournamentId}`

## Dependencies

- Phase 0 completed

## Expected Result

- Tournament list page: 0 DB queries on cache hit (currently 1)
- Tournament detail page standings: 0 DB queries for standings on cache hit (currently 2-3)
- Standings parsed result cached — avoids repeated `parseStandingsByMode` computation
- All caches invalidate cleanly when the data-provider writes new data

## Next Steps

Any remaining phase.

---

# Phase 2 — Match List Cache

## Goal

Cache match lists per tournament and round. This is the core data for the match cards shown on the left side of the tournament detail page.

## Tasks

### Task 2.1 — Cache `getMatchesByTournament` []

#### Task 2.1.a — Wrap the match service/query with cache-aside []

- Key: `matches:{tournamentId}:{roundSlug}`
- TTL: `CACHE_TTL.MEDIUM` (5min) — matches change when scraper updates scores
- This is the Match + homeTeam + awayTeam join — expensive and identical for every user viewing the same round

#### Task 2.1.b — Invalidate when match data is updated []

- In `QUERIES_MATCH.updateMatchFromPolling()`, invalidate `matches:{tournamentId}:*` (all rounds for that tournament, since a single poll can update multiple matches)
- In `QUERIES_MATCH.upsertMatches()` (used by data-provider), same invalidation
- Consider invalidating specific round key if round info is available in the update context

### Task 2.2 — Cache `getKnockoutRounds` []

#### Task 2.2.a — Wrap with cache-aside []

- Key: `knockout-rounds:{tournamentId}`
- TTL: `CACHE_TTL.LONG` (1h)

#### Task 2.2.b — Invalidate on knockout round sync []

- In `KnockoutRoundsSyncService` after sync completes

## Dependencies

- Phase 0 completed

## Expected Result

- Match list loads from cache for all users viewing the same tournament round
- Cache busts automatically when the scraper writes new scores
- Eliminates the Match + 2 Teams join for most requests

## Next Steps

Any remaining phase.

---

# Phase 3 — Dashboard Cache

## Goal

Cache the "current day matches" query that powers the dashboard.

## Tasks

### Task 3.1 — Cache `currentDayMatchesOnDatabase` []

#### Task 3.1.a — Wrap with cache-aside []

- Key: `dashboard:matches:{YYYY-MM-DD}` (date-scoped)
- TTL: `CACHE_TTL.SHORT` (60s) — dashboard should feel near-realtime during match days
- The date in the key ensures stale yesterday data is never served

#### Task 3.1.b — Invalidate when match scores update []

- In `updateMatchFromPolling`, invalidate `dashboard:matches:{today}`
- Only invalidate today's key since the query filters by date range

## Dependencies

- Phase 0 completed

## Expected Result

- Dashboard page: cache hit on repeat loads within 60s
- Automatic daily key rotation (old keys expire naturally)

## Next Steps

Any remaining phase.

---

# Phase 4 — Rate Limiting

## Goal

Add Redis-backed rate limiting middleware to protect the API from abuse.
Currently the middleware chain has no rate limiting at all.

## Tasks

### Task 4.1 — Install rate limiting library []

- `yarn add rate-limiter-flexible`
- This library supports Redis, in-memory fallback, and multiple strategies (sliding window, token bucket)

### Task 4.2 — Create `src/middlewares/rate-limiter.ts` []

#### Task 4.2.a — Implement rate limiter middleware []

- Use `RateLimiterRedis` from `rate-limiter-flexible` with the Redis client from Phase 0
- Fallback: `RateLimiterMemory` if Redis is unavailable (graceful degradation)
- Default limits (configurable via env):
  - General API: 100 requests per minute per IP
  - Auth endpoints: 10 requests per minute per IP (brute-force protection)
  - Data-provider/admin endpoints: exempt (internal token auth already protects these)

#### Task 4.2.b — Differentiate limits by route []

- Export `generalRateLimiter` and `authRateLimiter`
- Auth limiter applied specifically to `/api/v*/auth` routes
- General limiter applied globally in `src/apps/api/index.ts`

### Task 4.3 — Wire into Express middleware chain []

- Add after `accessControl` in `src/apps/api/index.ts`
- Internal/admin routes bypass the limiter (check `x-internal-token` presence)

### Task 4.4 — Add rate limit env vars to templates []

- `RATE_LIMIT_GENERAL=100` (requests per minute)
- `RATE_LIMIT_AUTH=10` (requests per minute)

## Dependencies

- Phase 0 completed
- `rate-limiter-flexible` package

## Expected Result

- API protected from brute-force and DDoS at the application layer
- Auth endpoints have stricter limits
- Graceful fallback to in-memory limiter if Redis is down
- Rate limit headers in responses (`X-RateLimit-Remaining`, `Retry-After`)

## Next Steps

Any remaining phase.

---

# Phase 5 — Scheduler Distributed Locking

## Goal

Prevent duplicate job execution if multiple instances of the scheduler run simultaneously.
Currently `node-cron` runs in-memory with no coordination between instances.

## Tasks

### Task 5.1 — Create `src/core/redis/lock.ts` []

#### Task 5.1.a — Implement distributed lock utility []

- `acquireLock(lockKey: string, ttlMs: number): Promise<boolean>` — uses `SET key value NX PX ttl`
- `releaseLock(lockKey: string): Promise<void>` — `DEL key`
- Lock value should be a unique identifier (e.g., `hostname + pid + timestamp`) to prevent accidental release by another instance

### Task 5.2 — Integrate locking into cron executor []

#### Task 5.2.a — Wrap recurring job execution with lock []

- Before executing a cron target, `acquireLock('cron:{targetLabel}:{runId}', ttl)`
- If lock not acquired, skip execution (another instance is handling it)
- Release lock after execution completes (or let TTL expire as safety net)

#### Task 5.2.b — Wrap one-time job sweep with lock []

- Before sweeping one-time jobs, acquire `lock:cron:sweep`
- Prevents two instances from picking up the same one-time job

### Task 5.3 — Integrate locking into match polling []

#### Task 5.3.a — Lock per-match during score polling []

- In `MatchesSyncService`, before polling a specific match: `acquireLock('poll:match:{matchId}', 30000)`
- Prevents overlapping scraper runs from hitting the same match on SofaScore simultaneously

## Dependencies

- Phase 0 completed
- Understanding of current scheduler in `src/apps/scheduler/`

## Expected Result

- Safe to run multiple scheduler instances without duplicate execution
- Match polling cannot overlap on the same match
- Locks auto-expire (TTL) as a safety net against stuck processes

## Next Steps

Monitor lock contention in production. If needed, consider Redlock for stronger guarantees across Redis failures.

---

# Summary — Independence Matrix

| Phase | Depends On | Can Deploy After |
|-------|-----------|-----------------|
| Phase 0 — Foundation | Nothing | Anytime (first) |
| Phase 1 — Tournament & Standings Cache | Phase 0 | Phase 0 |
| Phase 2 — Match List Cache | Phase 0 | Phase 0 |
| Phase 3 — Dashboard Cache | Phase 0 | Phase 0 |
| Phase 4 — Rate Limiting | Phase 0 | Phase 0 |
| Phase 5 — Scheduler Locking | Phase 0 | Phase 0 |

No phase depends on any other phase (except Phase 0). Ship in any order.
