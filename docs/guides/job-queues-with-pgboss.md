# Job Queues with pg-boss: A Complete Guide

## What is a Job Queue? (The Restaurant Analogy)

Imagine a restaurant:

```
WITHOUT A QUEUE (Synchronous):
┌─────────────┐
│   Customer  │ ──► "I want a pizza!" ──► Chef starts cooking
│   (Waits)   │                           Customer waits 30 mins
│  (30 mins)  │ ◄── Pizza ready! ────────  Customer finally leaves
└─────────────┘

Problem: Customer is blocked. They can't do anything else while waiting.
```

```
WITH A QUEUE (Asynchronous):
┌─────────────┐                    ┌──────────────┐
│   Customer  │ ──► Order placed   │  Order Queue │
│  (Leaves!)  │ ◄── "We'll call    │  [Pizza #1]  │
│             │     you!"           │  [Pasta #2]  │
└─────────────┘                    │  [Salad #3]  │
                                   └──────┬───────┘
      ↑                                   │
      │                                   ↓
      │                            ┌──────────────┐
      │                            │     Chef     │
      └─── "Pizza ready!" ─────    │  (Worker)    │
                                   │  Processing  │
                                   └──────────────┘

Benefit: Customer is free to do other things. Chef works at their own pace.
```

**In web applications:**
- **Customer** = Your API endpoint
- **Order** = A job (task to be done)
- **Queue** = pg-boss (stores jobs in PostgreSQL)
- **Chef** = Worker (processes jobs in background)

---

## Why Use pg-boss Specifically?

### The Options Landscape

```
Job Queue Options:

┌─────────────────────────────────────────────────────────────┐
│                    Redis-based Queues                       │
│  (Bull, BullMQ, Bee-Queue)                                  │
│  ✅ Very fast                                               │
│  ❌ Requires separate Redis server = extra $5-15/month      │
│  ❌ Another service to manage and monitor                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      pg-boss                                │
│  ✅ Uses your existing PostgreSQL database                  │
│  ✅ Zero extra infrastructure cost                          │
│  ✅ Transactional safety (jobs are ACID compliant)          │
│  ✅ Built-in scheduling (cron jobs)                         │
│  ⚠️  Slightly slower than Redis (but still very fast)      │
└─────────────────────────────────────────────────────────────┘

Decision: pg-boss wins for $10/month budget constraint!
```

---

## Core Concepts

### 1. Jobs

A **job** is a unit of work that needs to be done.

```typescript
// Example: Send a welcome email
const job = {
  name: 'send-welcome-email',      // What type of job
  data: { email: 'user@example.com' }, // Information needed
  options: {
    startAfter: 60,  // Delay 60 seconds
    retryLimit: 3    // Retry 3 times if it fails
  }
};
```

**Job Lifecycle:**

```
┌──────────────────────────────────────────────────────────────┐
│                        JOB LIFECYCLE                         │
└──────────────────────────────────────────────────────────────┘

1. CREATED
   ↓
   boss.send('job-name', data)
   ↓
2. ACTIVE (being processed)
   ↓
   Worker picks it up and runs handler
   ↓
   ┌─────────┬─────────┐
   │ Success │ Failure │
   ↓         ↓         ↓
3. COMPLETED  RETRY → ACTIVE (retry with backoff)
              ↓
              (max retries exceeded)
              ↓
           FAILED (dead letter)
```

### 2. Queues

A **queue** is a container for jobs of the same type.

```
Database (PostgreSQL)
├── pgboss schema (pg-boss tables)
│   ├── queue table
│   │   ├── send-welcome-email    ← Queue 1
│   │   ├── update-match-scores   ← Queue 2
│   │   └── generate-report       ← Queue 3
│   │
│   └── job table
│       ├── [Job #1] → Queue: send-welcome-email, Status: active
│       ├── [Job #2] → Queue: update-match-scores, Status: created
│       └── [Job #3] → Queue: send-welcome-email, Status: completed
```

**Important:** Queues must be created before sending jobs!

```typescript
// Create a queue
await boss.createQueue('send-welcome-email');

// Now you can send jobs to it
await boss.send('send-welcome-email', { email: 'user@example.com' });
```

### 3. Workers

A **worker** is a function that processes jobs from a queue.

```
┌────────────────────────────────────────────────────────────┐
│                    WORKER PATTERN                          │
└────────────────────────────────────────────────────────────┘

Queue: update-match-scores
├── Job #1: { matchId: 'abc' }
├── Job #2: { matchId: 'def' }
└── Job #3: { matchId: 'ghi' }
    ↓
    ↓ Worker polls every 2 seconds
    ↓
┌─────────────────────────────────────┐
│   Worker Function                   │
│   async (jobs) => {                 │
│     for (const job of jobs) {       │
│       // Process job                │
│       await updateMatchScore(       │
│         job.data.matchId            │
│       );                            │
│     }                               │
│   }                                 │
└─────────────────────────────────────┘
```

---

## How pg-boss Works Internally

```
┌──────────────────────────────────────────────────────────────────┐
│                   YOUR APPLICATION                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  API Endpoint                          Background Worker        │
│  ┌──────────────┐                     ┌──────────────────┐     │
│  │ POST /match  │                     │  Worker Process  │     │
│  │              │                     │                  │     │
│  │ 1. Save match│                     │ 4. Fetch job     │     │
│  │ 2. Send job  │                     │ 5. Process       │     │
│  │ 3. Return OK │                     │ 6. Mark complete │     │
│  └──────┬───────┘                     └────────▲─────────┘     │
│         │                                      │               │
│         │ boss.send()              boss.work()│               │
└─────────┼──────────────────────────────────────┼───────────────┘
          │                                      │
          ↓                                      ↓
┌──────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                                 │
├──────────────────────────────────────────────────────────────────┤
│  pgboss.job table                                                │
│  ┌─────────┬──────────────┬─────────┬────────────────────┐      │
│  │ id      │ name         │ state   │ data               │      │
│  ├─────────┼──────────────┼─────────┼────────────────────┤      │
│  │ abc-123 │ update-match │ created │ {"matchId":"xyz"}  │ ← 3  │
│  │ def-456 │ update-match │ active  │ {"matchId":"abc"}  │ ← 4  │
│  │ ghi-789 │ update-match │complete │ {"matchId":"mno"}  │      │
│  └─────────┴──────────────┴─────────┴────────────────────┘      │
│                                                                  │
│  Workers poll this table using SQL:                              │
│  SELECT * FROM pgboss.job                                        │
│  WHERE state = 'created' AND startAfter <= NOW()                 │
│  LIMIT 1 FOR UPDATE SKIP LOCKED;                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Key Insight:** pg-boss uses PostgreSQL's `FOR UPDATE SKIP LOCKED` to ensure:
- Only one worker processes each job
- No race conditions
- Efficient polling without conflicts

---

## TypeScript Patterns

### Pattern 1: Basic Job Processing

```typescript
import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';

// Define your job data type
type WelcomeEmailData = {
  email: string;
  userName: string;
};

// Create worker
await boss.work<WelcomeEmailData>(
  'send-welcome-email',
  async (jobs: Job<WelcomeEmailData>[]) => {
    // ⚠️ IMPORTANT: jobs is an ARRAY!
    for (const job of jobs) {
      console.log(`Sending email to ${job.data.email}`);
      await sendEmail(job.data.email, job.data.userName);
    }
  }
);

// Send a job
await boss.send<WelcomeEmailData>(
  'send-welcome-email',
  { email: 'user@example.com', userName: 'John' }
);
```

**Why is `jobs` an array?**

pg-boss can batch process multiple jobs for efficiency:

```
Single Job Processing (Slower):
┌─────┐  ┌─────┐  ┌─────┐
│ Job │  │ Job │  │ Job │
│  1  │  │  2  │  │  3  │
└──┬──┘  └──┬──┘  └──┬──┘
   │        │        │
   ↓ 10ms   ↓ 10ms   ↓ 10ms
Total: 30ms

Batch Processing (Faster):
┌─────┬─────┬─────┐
│ Job │ Job │ Job │
│  1  │  2  │  3  │
└──┬──┴──┬──┴──┬──┘
   │     │     │
   └─────┴─────┘
        ↓ 15ms
Total: 15ms (50% faster!)
```

### Pattern 2: Domain-Specific Job Classes

```typescript
// src/domains/scheduler/jobs/base-job.ts
export abstract class BaseJob<TData extends object> {
  protected boss: PgBoss;
  abstract readonly jobName: string;

  constructor(boss: PgBoss) {
    this.boss = boss;
  }

  // Start listening for jobs
  async startWorker(): Promise<void> {
    await this.boss.work<TData>(
      this.jobName,
      async (jobs: Job<TData>[]) => {
        for (const job of jobs) {
          await this.process(job.data);
        }
      }
    );
  }

  // Send a job
  async send(data: TData, options?: SendOptions): Promise<string | null> {
    return this.boss.send(this.jobName, data, options);
  }

  // Implement in child classes
  abstract process(data: TData): Promise<void>;
}

// src/domains/scheduler/jobs/match-update-job.ts
type MatchUpdateData = {
  matchId: string;
  tournamentId: string;
};

export class MatchUpdateJob extends BaseJob<MatchUpdateData> {
  readonly jobName = 'update-match-scores';

  async process(data: MatchUpdateData): Promise<void> {
    console.log(`Updating match ${data.matchId}...`);
    // Your business logic here
    await updateMatchScores(data.matchId);
  }
}

// Usage:
const matchJob = new MatchUpdateJob(boss);
await matchJob.startWorker();
await matchJob.send({ matchId: 'abc', tournamentId: 'xyz' });
```

---

## Real-World Example: Your Match Update System

Let's apply this to your actual use case.

### The Problem

```
Current State (Manual):
┌─────────────────────────────────────────────────────────────┐
│ Admin calls API: "Update all matches for tournament X"     │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ API scrapes 50 matches × 5 seconds each = 250 seconds      │
│ Admin waits... and waits... and waits...                   │
│ Request times out after 30 seconds ❌                      │
└─────────────────────────────────────────────────────────────┘
```

### The Solution with pg-boss

```
New State (Queue-based):
┌─────────────────────────────────────────────────────────────┐
│ Admin calls API: "Update all matches for tournament X"     │
└─────────────────────────────────────────────────────────────┘
   ↓ Instant response
┌─────────────────────────────────────────────────────────────┐
│ API: "Queued 50 jobs! Check status at /api/jobs/abc"       │
│ Admin: *happy, can close browser* ✅                        │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ Background Worker (running separately):                     │
│ - Picks up jobs from queue                                 │
│ - Processes 5 matches concurrently                          │
│ - Updates lastCheckedAt timestamp                           │
│ - Retries failures with exponential backoff                 │
│ - Admin can check progress anytime                          │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Flow

```
1. API Endpoint (Fast Response)
┌────────────────────────────────────────────┐
│ POST /api/v2/admin/matches/update-round   │
├────────────────────────────────────────────┤
│ 1. Fetch matches to update                │
│ 2. Queue jobs for each match              │
│ 3. Return immediately                     │
└────────────────────────────────────────────┘
   ↓
   Creates jobs:
   ├─► Job #1: { matchId: 'match-1' }
   ├─► Job #2: { matchId: 'match-2' }
   └─► Job #3: { matchId: 'match-3' }

2. Worker (Background Processing)
┌────────────────────────────────────────────┐
│ Worker polls queue every 10 seconds       │
├────────────────────────────────────────────┤
│ Picks up: [Job #1, Job #2, Job #3]        │
│                                            │
│ For each job:                              │
│   1. Scrape match data from SofaScore     │
│   2. Update database                       │
│   3. Update lastCheckedAt                  │
│   4. Mark job complete                     │
│                                            │
│ If fails: Retry with backoff               │
│   - Attempt 1: fail → wait 30s             │
│   - Attempt 2: fail → wait 60s             │
│   - Attempt 3: fail → wait 120s            │
│   - Give up → log error to Sentry          │
└────────────────────────────────────────────┘
```

### Code Example

```typescript
// src/domains/scheduler/services/match-scraping-job.ts
import type { Job } from 'pg-boss';
import { getQueue } from '@/services/queue';
import { MatchesDataProviderService } from '@/domains/data-provider/services';

type MatchScrapingData = {
  matchId: string;
  tournamentId: string;
};

export class MatchScrapingJob {
  private readonly JOB_NAME = 'scrape-match-scores';

  async initialize(): Promise<void> {
    const boss = await getQueue();
    if (!boss) return;

    // Create queue
    await boss.createQueue(this.JOB_NAME);

    // Start worker
    await boss.work<MatchScrapingData>(
      this.JOB_NAME,
      {
        teamSize: 5,        // Process 5 jobs concurrently
        teamConcurrency: 1  // Each worker handles 1 job at a time
      },
      async (jobs: Job<MatchScrapingData>[]) => {
        for (const job of jobs) {
          await this.processMatch(job.data);
        }
      }
    );

    console.log('✅ Match scraping worker started');
  }

  private async processMatch(data: MatchScrapingData): Promise<void> {
    console.log(`[MatchScraping] Processing match ${data.matchId}`);

    try {
      // Your existing scraping logic
      const service = new MatchesDataProviderService();
      await service.updateMatchById(data.matchId);

      console.log(`✅ Match ${data.matchId} updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to update match ${data.matchId}:`, error);
      throw error; // pg-boss will retry
    }
  }

  async queueMatch(matchId: string, tournamentId: string): Promise<string | null> {
    const boss = await getQueue();
    if (!boss) throw new Error('Queue not available');

    return boss.send<MatchScrapingData>(
      this.JOB_NAME,
      { matchId, tournamentId },
      {
        retryLimit: 3,
        retryDelay: 30,      // 30 seconds
        retryBackoff: true,  // Exponential: 30s, 60s, 120s
        expireInHours: 24    // Clean up after 24 hours
      }
    );
  }
}
```

---

## Cron Jobs & Automation: Common Questions

### Question 1: "Does the cron job run forever?"

**Short Answer:** Yes, and that's actually **GOOD** and **smart**! Here's why:

```
CRON JOB RUNS EVERY 10 MINUTES (Forever):
┌────────────────────────────────────────────────────────┐
│ Time: 10:00 AM                                         │
│ Cron triggers → Query DB for matches to check          │
│                                                         │
│ SELECT * FROM match                                    │
│ WHERE status = 'open'  ← Only check LIVE/UPCOMING     │
│   AND (last_checked_at IS NULL                         │
│        OR last_checked_at < NOW() - INTERVAL '10min')  │
│ LIMIT 50;                                              │
│                                                         │
│ Result: 5 matches found → Process them                │
└────────────────────────────────────────────────────────┘
   ↓ 10 minutes later...
┌────────────────────────────────────────────────────────┐
│ Time: 10:10 AM                                         │
│ Cron triggers → Query DB again                         │
│                                                         │
│ Result: 3 NEW matches + 2 still open → Process 5      │
└────────────────────────────────────────────────────────┘
   ↓ 10 minutes later...
┌────────────────────────────────────────────────────────┐
│ Time: 10:20 AM                                         │
│ Cron triggers → Query DB again                         │
│                                                         │
│ Result: 0 matches (all finished!) → Does nothing      │
│ Cost: Just one fast DB query ≈ 5ms                    │
└────────────────────────────────────────────────────────┘
```

**Key insight:** The cron runs forever, but it's **self-regulating**:
- ✅ Only processes matches that NEED checking (status = 'open')
- ✅ Skips matches that were recently checked (last_checked_at filter)
- ✅ When no matches need updating, it just runs a quick query and exits
- ✅ Very low cost when idle (just a SQL query every 10 mins)

**Example Timeline During a Tournament:**

```
Tournament Lifecycle:
├─ Week 1: Group Stage
│  └─ Cron finds: 20-30 matches per day to check ✅
│
├─ Week 2: Round of 16
│  └─ Cron finds: 8 matches per day to check ✅
│
├─ Week 3: Finals
│  └─ Cron finds: 1-2 matches per day to check ✅
│
└─ Week 4: Tournament Over
   └─ Cron finds: 0 matches (all status='finished')
      → Query runs but does nothing (< 5ms) ✅
```

---

### Question 2: "Who triggers the cron for the first time?"

**Answer:** Your **application startup** triggers it!

#### Application Startup Sequence

```
┌──────────────────────────────────────────────────────────┐
│ RAILWAY DEPLOYS YOUR APP                                │
└──────────────────────────────────────────────────────────┘
   ↓
┌──────────────────────────────────────────────────────────┐
│ 1. Railway starts: node dist/index.js                   │
└──────────────────────────────────────────────────────────┘
   ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Your index.ts runs                                    │
│    ├─ Connect to database ✅                            │
│    ├─ Initialize pg-boss ✅                             │
│    ├─ Start Express server ✅                           │
│    └─ Initialize cron jobs ✅ ← HERE!                   │
└──────────────────────────────────────────────────────────┘
   ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Cron job starts automatically                        │
│    └─ Runs every 10 minutes from now on                │
└──────────────────────────────────────────────────────────┘
```

#### Code Example:

```typescript
// src/index.ts (your main entry point)
import express from 'express';
import { initializeCronJobs } from './scheduler/cron-jobs';
import { getQueue } from './services/queue';

async function startServer() {
  console.log('🚀 Starting application...');

  // 1. Start Express
  const app = express();
  // ... setup routes, middleware, etc.

  // 2. Initialize pg-boss
  await getQueue();
  console.log('✅ Queue initialized');

  // 3. Initialize cron jobs (THIS TRIGGERS THE FIRST RUN!)
  if (process.env.MATCH_POLLING_ENABLED === 'true') {
    await initializeCronJobs();
    console.log('✅ Cron jobs initialized - polling starts now!');
  }

  // 4. Start HTTP server
  const server = app.listen(9090, () => {
    console.log('✅ Server listening on port 9090');
  });

  // 5. Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    server.close();
    await stopQueue();
  });
}

startServer();
```

```typescript
// src/scheduler/cron-jobs.ts
import cron from 'node-cron';
import { pollAndQueueMatches } from './services/match-polling.service';

export async function initializeCronJobs() {
  // This runs IMMEDIATELY when called
  // Then repeats every 10 minutes forever

  cron.schedule('*/10 * * * *', async () => {
    console.log('[CRON] Match polling triggered');

    try {
      await pollAndQueueMatches();
      console.log('[CRON] ✅ Polling completed');
    } catch (error) {
      console.error('[CRON] ❌ Polling failed:', error);
    }
  });

  console.log('✅ Cron job scheduled: every 10 minutes');
}
```

---

### Visual Timeline: What Actually Happens

```
DAY 1: You deploy to Railway
─────────────────────────────────────────────────────────
00:00 → Railway starts your app
00:01 → index.ts runs → initializeCronJobs() called
00:01 → First cron job registered (not running yet)
00:10 → ⏰ First trigger! Polls database, queues jobs
00:20 → ⏰ Second trigger
00:30 → ⏰ Third trigger
...
23:50 → ⏰ 144th trigger (runs 144 times per day)
─────────────────────────────────────────────────────────

DAY 2: Railway restarts your app (deploy/crash/whatever)
─────────────────────────────────────────────────────────
00:00 → Railway restarts → initializeCronJobs() called again
00:00 → Cron resets → First trigger happens immediately
00:10 → Second trigger
...
(continues forever until next restart)
─────────────────────────────────────────────────────────
```

---

### Two Deployment Options

#### Option A: Single Process (Simpler - Recommended for You)

```
Railway runs ONE process that does everything:

┌─────────────────────────────────────────┐
│   Your Node.js App (Port 9090)         │
├─────────────────────────────────────────┤
│ ✅ Express API (handles HTTP requests)  │
│ ✅ Cron Jobs (runs every 10 mins)       │
│ ✅ pg-boss Workers (processes jobs)     │
└─────────────────────────────────────────┘

Pros: Simple, fewer moving parts
Cons: API and cron share resources
```

**For your $10/month budget:** This is the way to go!

#### Option B: Separate Processes (More Advanced)

```
Railway runs TWO separate processes:

Process 1: Web (Port 9090)
┌─────────────────────────────────────────┐
│   Web Server                            │
├─────────────────────────────────────────┤
│ ✅ Express API                          │
│ ❌ NO cron jobs                         │
│ ❌ NO workers                           │
└─────────────────────────────────────────┘

Process 2: Scheduler (No port)
┌─────────────────────────────────────────┐
│   Background Scheduler                  │
├─────────────────────────────────────────┤
│ ❌ NO Express API                       │
│ ✅ Cron Jobs (every 10 mins)            │
│ ✅ pg-boss Workers                      │
└─────────────────────────────────────────┘

Pros: Better resource isolation, scalable
Cons: More complex, costs 2x on Railway
```

---

### What If the Server Crashes/Restarts?

```
SCENARIO: Railway restarts your app
─────────────────────────────────────────

Before Restart:
├─ 10:00 → Cron runs ✅
├─ 10:10 → Cron runs ✅
├─ 10:17 → 💥 APP CRASHES! 💥
└─ [cron stops running]

Railway Auto-Restart (10 seconds later):
├─ 10:17 → Railway detects crash
├─ 10:17 → Railway starts new container
├─ 10:17 → index.ts runs → initializeCronJobs()
├─ 10:17 → Cron resets and starts fresh
└─ 10:20 → Next scheduled run ✅

Impact:
- Lost: 3 minutes (10:17 - 10:20)
- Database state: Safe! last_checked_at still accurate
- Next poll: Will catch up on any missed matches
```

**Key Safety Feature:** Your polling query doesn't care about missed cron runs! It checks `last_checked_at`, so even if cron misses a cycle, the next run will pick up those matches.

---

### Summary: Cron Jobs Automation

1. **Yes, cron runs forever** - but that's good! It's self-regulating and cheap when idle
2. **Your app startup triggers it** - `initializeCronJobs()` in `index.ts`
3. **Restarts are handled automatically** - Railway restarts, cron resets, life goes on
4. **You control it with env var** - `MATCH_POLLING_ENABLED=true/false`

**The beauty of this design:** Set it and forget it! Once deployed, it runs automatically forever with zero manual intervention. 🎉

---

## Common Patterns & Best Practices

### 1. Graceful Startup

```typescript
// src/server.ts
import { getQueue, stopQueue } from '@/services/queue';
import { MatchScrapingJob } from '@/domains/scheduler/services/match-scraping-job';

async function startServer() {
  // Start Express
  const app = express();

  // Initialize queue and workers
  const boss = await getQueue();
  if (boss) {
    const matchJob = new MatchScrapingJob();
    await matchJob.initialize();
  }

  // Start HTTP server
  const server = app.listen(PORT);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close();
    await stopQueue();
    process.exit(0);
  });
}

startServer();
```

### 2. Error Handling

```typescript
await boss.work<JobData>('job-name', async (jobs) => {
  for (const job of jobs) {
    try {
      await processJob(job.data);
    } catch (error) {
      // Log error for monitoring
      console.error(`Job ${job.id} failed:`, error);

      // Sentry integration
      if (error instanceof CriticalError) {
        captureException(error);
      }

      // Re-throw to trigger retry
      throw error;
    }
  }
});
```

### 3. Monitoring Job Progress

```typescript
// Get job status
const job = await boss.getJobById('job-name', 'job-id');

console.log(job.state); // 'created' | 'active' | 'completed' | 'failed'
console.log(job.createdOn); // Timestamp
console.log(job.startedOn); // When processing started
console.log(job.completedOn); // When finished

// Count jobs by state
const counts = await boss.getQueueSize('job-name');
// Returns counts for different states
```

### 4. Scheduled/Cron Jobs

```typescript
// Run every 10 minutes
await boss.schedule(
  'match-polling-cron',
  '*/10 * * * *', // Cron expression
  { priority: 1 }
);

// Worker for scheduled job
await boss.work('match-polling-cron', async () => {
  console.log('Running scheduled match polling...');
  await pollAndQueueMatches();
});
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Create Queue

```typescript
// ❌ BAD: This will fail
await boss.send('my-job', { data: 'test' });
// Error: Queue my-job does not exist

// ✅ GOOD: Create queue first
await boss.createQueue('my-job');
await boss.send('my-job', { data: 'test' });
```

### Pitfall 2: Not Handling Array in Worker

```typescript
// ❌ BAD: Treating jobs as single job
await boss.work('my-job', async (job) => {
  console.log(job.data); // ❌ Error: job is an array!
});

// ✅ GOOD: Iterate over jobs array
await boss.work('my-job', async (jobs) => {
  for (const job of jobs) {
    console.log(job.data); // ✅ Works!
  }
});

// ✅ ALSO GOOD: Destructure first job if you only process one
await boss.work('my-job', async ([job]) => {
  console.log(job.data); // ✅ Works!
});
```

### Pitfall 3: Blocking the Worker

```typescript
// ❌ BAD: Synchronous blocking code
await boss.work('my-job', async (jobs) => {
  for (const job of jobs) {
    // This blocks the event loop!
    const result = fs.readFileSync('/path/to/file');
  }
});

// ✅ GOOD: Use async operations
await boss.work('my-job', async (jobs) => {
  for (const job of jobs) {
    const result = await fs.promises.readFile('/path/to/file');
  }
});
```

### Pitfall 4: Not Cleaning Up Workers

```typescript
// ❌ BAD: Worker keeps running after tests
test('my job', async () => {
  await boss.work('test-job', handler);
  // Test runs... but worker keeps polling!
});

// ✅ GOOD: Clean up after tests
test('my job', async () => {
  await boss.work('test-job', handler);
  // ... test code ...
  await boss.offWork('test-job'); // Stop worker
  await boss.stop(); // Stop pg-boss
});
```

---

## Performance Tuning

### Worker Concurrency

```
teamSize vs teamConcurrency:

teamSize = 3, teamConcurrency = 1
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Worker1 │  │ Worker2 │  │ Worker3 │
│ Job A   │  │ Job B   │  │ Job C   │
└─────────┘  └─────────┘  └─────────┘
3 jobs processed in parallel

teamSize = 1, teamConcurrency = 3
┌──────────────────────────────┐
│         Worker1              │
│  Job A │ Job B │ Job C       │
└──────────────────────────────┘
3 jobs processed in one worker
(useful for I/O-bound jobs)
```

```typescript
await boss.work(
  'scrape-matches',
  {
    teamSize: 5,          // 5 worker instances
    teamConcurrency: 2,   // Each processes 2 jobs concurrently
    // = 10 total jobs in parallel!
  },
  handler
);
```

### Polling Interval

```typescript
// Default: polls every 2 seconds
const boss = new PgBoss({
  connectionString: '...',
  pollInterval: 5000, // Poll every 5 seconds (less DB load)
});

// For urgent jobs: poll more frequently
pollInterval: 1000 // Every 1 second
```

---

## Testing with pg-boss

```typescript
// test/match-scraping-job.test.ts
import { PgBoss } from 'pg-boss';

describe('MatchScrapingJob', () => {
  let boss: PgBoss;

  beforeAll(async () => {
    boss = new PgBoss(process.env.TEST_DB_CONNECTION);
    await boss.start();
  });

  afterAll(async () => {
    await boss.stop();
  });

  afterEach(async () => {
    // Clean up test jobs
    await boss.deleteAllJobs();
  });

  it('should process match update job', async () => {
    const job = new MatchScrapingJob();
    await job.initialize();

    // Send test job
    const jobId = await job.queueMatch('match-123', 'tournament-xyz');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify job completed
    const result = await boss.getJobById('scrape-match-scores', jobId!);
    expect(result?.state).toBe('completed');
  });
});
```

---

## Monitoring & Observability

### Health Check Endpoint

```typescript
// src/router/health.ts
router.get('/health/queue', async (req, res) => {
  const boss = await getQueue();

  if (!boss) {
    return res.status(503).json({ status: 'unavailable' });
  }

  const queues = ['scrape-match-scores', 'send-email', 'generate-report'];
  const stats = [];

  for (const queueName of queues) {
    const size = await boss.getQueueSize(queueName);
    stats.push({
      queue: queueName,
      pending: size, // Jobs waiting to be processed
    });
  }

  res.json({
    status: 'healthy',
    queues: stats
  });
});
```

### Logging

```typescript
await boss.work('my-job', async (jobs) => {
  console.log(`[Worker] Processing ${jobs.length} jobs`);

  for (const job of jobs) {
    console.log(`[Job:${job.id}] Started`);

    try {
      await processJob(job.data);
      console.log(`[Job:${job.id}] ✅ Completed`);
    } catch (error) {
      console.error(`[Job:${job.id}] ❌ Failed:`, error);
      throw error;
    }
  }
});
```

---

## Comparison: Before vs After pg-boss

```
BEFORE (Synchronous, Manual):
┌─────────────────────────────────────────────────────────┐
│ Timeline: Admin triggers match update                  │
├─────────────────────────────────────────────────────────┤
│ 0:00  → API: "Starting update..."                      │
│ 0:05  → Scraping match 1... (5s)                       │
│ 0:10  → Scraping match 2... (5s)                       │
│ 0:15  → Scraping match 3... (5s)                       │
│ 0:20  → Scraping match 4... (5s)                       │
│ 0:25  → Scraping match 5... (5s)                       │
│ 0:30  → ⚠️  REQUEST TIMEOUT! Admin sees error         │
│ Total: 30s, only 5 matches updated ❌                  │
└─────────────────────────────────────────────────────────┘

AFTER (Asynchronous, Queue-based):
┌─────────────────────────────────────────────────────────┐
│ Timeline: Admin triggers match update                  │
├─────────────────────────────────────────────────────────┤
│ 0:00  → API: "Queued 50 jobs!" (instant response)      │
│ Admin: *closes browser, goes for coffee* ☕            │
│                                                         │
│ Background (5 workers, concurrent):                    │
│ 0:01  → [W1] Match 1  [W2] Match 2  [W3] Match 3      │
│         [W4] Match 4  [W5] Match 5                     │
│ 0:06  → [W1] Match 6  [W2] Match 7  [W3] Match 8      │
│         [W4] Match 9  [W5] Match 10                    │
│ ...                                                     │
│ 1:00  → All 50 matches updated! ✅                     │
│                                                         │
│ Admin checks: "Oh nice, it's done!" 😊                │
│ Total: 1 min for 50 matches (vs 5 mins synchronous)   │
└─────────────────────────────────────────────────────────┘
```

---

## Summary & Key Takeaways

### What You Learned

1. **Job Queues** decouple request/response from slow background work
2. **pg-boss** uses PostgreSQL (no extra infrastructure needed!)
3. **Workers** are functions that process jobs asynchronously
4. **TypeScript** gives you type-safe job handling with generics
5. **Retry logic** makes your system resilient to failures

### When to Use pg-boss

✅ **Use pg-boss when:**
- You have slow operations (> 5 seconds)
- You need background processing
- You want retry logic
- You're on a tight budget
- You already have PostgreSQL

❌ **Don't use pg-boss when:**
- Operations are very fast (< 100ms)
- You need real-time processing (use WebSockets)
- You need sub-second latency (use Redis)

### Next Steps for Your Project

1. **Phase 2**: Implement match polling service
2. Use pg-boss to queue match updates
3. Set up cron job to trigger polling every 10 minutes
4. Monitor with health check endpoint
5. Deploy and profit! 🚀

---

**Remember:** The goal is to free your API from slow operations. Let background workers handle the heavy lifting while your users get instant responses!

Got questions? Ask away! 💬
