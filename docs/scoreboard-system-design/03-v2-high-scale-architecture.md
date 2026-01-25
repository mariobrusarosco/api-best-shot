# Scoreboard System Design V2 - High Scale Architecture

## 1. Architectural Requirements & Constraints

### 1.1 Performance & Scale
- **User Load:** Support up to **1 Million** active users per tournament.
- **Throughput:** Handle bursts of up to **10 concurrent match updates** (e.g., simultaneous final whistles).
- **Latency (API):** P99 response time for scoreboard reads must be **< 100ms** even during heavy background calculation.
- **Latency (Consistency):** Scores should be fully propagated to the scoreboard within **30 seconds** of match finalization.

### 1.2 Reliability & Fault Tolerance
- **Asynchronous Execution:** Scoreboard updates must be decoupled from the scraper/orchestrator loop.
- **Durable Retries:** Automatic retry mechanism for failed point calculations or database/cache writes.
- **Isolation:** A failure in the Scoreboard logic (e.g., OOM, logic bug) must NOT kill the Match Scheduler.
- **Observability:** Metrics tracking job duration, success/fail rates, and Redis/Postgres write latency.

### 1.3 Resource Efficiency
- **Memory Safety:** Processing must use a constant/fixed amount of RAM (via Streaming/Batching) regardless of input size (10k vs 1M guesses).
- **Database Load Balancing:** Prevent connection pool exhaustion during massive bulk updates.

## 2. Executive Summary
This document outlines the architectural evolution from the V1 Scoreboard (Synchronous, Monolithic) to a V2 Scoreboard designed for **High Traffic** and **Enterprise-grade Robustness**.

**Primary Goal:** Transition to an asynchronous "Worker" model that ensures zero latency impact on end-users during massive updates and guarantees data integrity under failure conditions.

## 3. Analysis of V1 Limitations (Why we need V2)

### 3.1 The "Blocking" Event Loop
- **Current State:** `ScoreboardService.calculateMatchPoints` runs synchronously in the main API container.
- **The Bottleneck:** Processing 95k users takes ~350ms. Processing **1M users** would take ~3.5 seconds.
- **Impact:** During this 3.5s window, **ALL API requests hang**. Users see "frozen" apps.
- **Verdict:** Unacceptable for high scale.

### 3.2 Memory Pressure
- **Current State:** All guesses for a match are loaded into a single memory array (`db.select()`).
- **The Bottleneck:** 1M rows * 0.5KB = 500MB of raw data.
- **Impact:** Small containers (512MB/1GB) will **Crash (OOM)** during a high-profile match update.
- **Verdict:** Unsafe. Requires **Streaming** or **Keyset Pagination**.

### 3.3 Failure Isolation
- **Current State:** The Scoreboard update is a nested call inside the `MatchUpdateOrchestrator`.
- **Risk:** A calculation crash kills the entire orchestrator process. There is no way to retry *only* the scoreboard update.
- **Verdict:** Poor isolation. Needs a durable **Job Queue**.

## 4. V2 Architecture Proposal: The "Worker" Model

### 4.1 Core Shift: Asynchronous Processing
Instead of "Match Ends -> Calculate Now", we shift to "Match Ends -> Enqueue Job".

```text
  [ SCENARIO: Match Ends ]

  ┌─────────────────────────────┐       ┌─────────────────────────────┐
  │ MatchUpdateOrchestrator     │       │      Message Broker         │
  │ (Scheduler)                 │       │      (Redis / PgBoss)       │
  │ 1. Update Match Status      │──────►│ [JOB: CalculateScore]       │
  │ 2. Publish Event            │       │ Payload: { matchId }        │
  └─────────────────────────────┘       └──────────────┬──────────────┘
                                                       │
          ┌────────────────────────────────────────────┘
          ▼
  ┌─────────────────────────────┐
  │ Scoreboard Worker (New)     │
  │ (Dedicated Container)       │
  │ 1. Fetch Guesses (Stream)   │ ◄── Safe, Batch Processing
  │ 2. Calculate Deltas         │
  │ 3. Bulk Write Postgres      │
  │ 4. Pipeline Write Redis     │
  └─────────────────────────────┘
```

### 4.2 Technology Candidates

1. **Queue System:**
   - *Option A: PgBoss:* Uses Postgres. Already present in `package.json`. No extra infra needed.
   - *Option B: BullMQ (Redis):* Industry standard for high throughput. We already have Redis.

2. **Processing Pattern:**
   - *Node.js Streams:* Using `drizzle-orm` stream mode to pipe DB rows directly through the calculation logic to prevent memory spikes.

## 5. Next Steps
1. Select Queue Technology (Recommendation: BullMQ if high frequency, PgBoss if consistent).
2. Design the Worker Service infrastructure.
3. Implement the "Streaming Calculation" prototype.