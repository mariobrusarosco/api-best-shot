# Automated Match Updates - Option 1: Railway Job Queue

## Overview

This document describes **Option 1** for automating match score and standings updates using a **database-backed job queue** with Railway's native cron support.

### The Problem We're Solving

We need to automatically update match scores and tournament standings approximately **2 hours after each match starts**, without:
- ❌ Complex AWS Lambda deployments
- ❌ Hard-to-debug CloudWatch logs
- ❌ Dynamic EventBridge schedule management
- ❌ Multiple infrastructure platforms

### The Solution

Use a **static cron job** (every 5 minutes) that processes a **dynamic database queue** of scheduled jobs.

---

## Core Concept

**We DON'T dynamically create cron jobs.** Instead:

1. **Static cron jobs** (configured once in Railway) run on fixed schedules
2. **Database records** (`T_ScheduledJob`) act as a dynamic queue
3. The cron job **processes whatever is in the queue** at that moment

Think of it like a **to-do list**:
- **Daily (6am)**: We write tasks on the list → Create DB records for today's matches
- **Every 5 min**: We check the list and do tasks that are due → Query DB + execute updates

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARCHITECTURE OVERVIEW                      │
└─────────────────────────────────────────────────────────────────┘

Railway Cron Jobs (Static, configured once)
    ↓
    ├─ Daily at 6am: Create jobs for today's matches
    └─ Every 5 min: Process jobs that are due

Database Table (T_ScheduledJob)
    ↓
    Dynamic queue of pending jobs
    Each record = one match update task

Admin API Endpoints
    ↓
    Called by cron to update scores/standings
    Reuses existing admin logic
```

---

## Architecture Components

### 1. Database Schema

```sql
CREATE TABLE scheduled_job (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     TEXT NOT NULL,
  match_id          TEXT,
  round_slug        TEXT NOT NULL,
  job_type          TEXT NOT NULL,        -- 'UPDATE_MATCH_SCORES'
  scheduled_for     TIMESTAMP NOT NULL,   -- When to execute (match time + 2 hours)
  status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
  executed_at       TIMESTAMP,
  error             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),

  INDEX idx_scheduled_jobs_pending (status, scheduled_for)
);
```

**TypeScript Schema:**
```typescript
export const T_ScheduledJob = pgTable('scheduled_job', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: text('tournament_id').notNull(),
  matchId: text('match_id'),
  roundSlug: text('round_slug').notNull(),
  jobType: text('job_type').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  status: text('status').notNull().default('pending'),
  executedAt: timestamp('executed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pendingIdx: index('idx_scheduled_jobs_pending').on(table.status, table.scheduledFor),
}));
```

### 2. Railway Cron Configuration

**File:** `railway.json` or Railway dashboard settings

```json
{
  "crons": [
    {
      "schedule": "0 6 * * *",
      "command": "curl -X POST http://localhost:9090/internal/scheduler/create-daily-jobs -H 'X-Internal-Token: $INTERNAL_SERVICE_TOKEN'"
    },
    {
      "schedule": "*/5 * * * *",
      "command": "curl -X POST http://localhost:9090/internal/scheduler/process-jobs -H 'X-Internal-Token: $INTERNAL_SERVICE_TOKEN'"
    },
    {
      "schedule": "0 0 * * *",
      "command": "curl -X POST http://localhost:9090/internal/scheduler/cleanup-jobs -H 'X-Internal-Token: $INTERNAL_SERVICE_TOKEN'"
    }
  ]
}
```

**Cron Schedule Breakdown:**

| Schedule      | Frequency           | Purpose                          |
|---------------|---------------------|----------------------------------|
| `0 6 * * *`   | Daily at 6:00 AM    | Create jobs for today's matches  |
| `*/5 * * * *` | Every 5 minutes     | Process due jobs                 |
| `0 0 * * *`   | Daily at midnight   | Cleanup old completed jobs       |

### 3. API Endpoints

**Internal Scheduler Endpoints** (protected by `X-Internal-Token`):

```typescript
// File: src/domains/scheduler/routes/internal.ts

router.post('/internal/scheduler/create-daily-jobs',
  InternalMiddleware,
  SchedulerController.createDailyJobs
);

router.post('/internal/scheduler/process-jobs',
  InternalMiddleware,
  SchedulerController.processJobs
);

router.post('/internal/scheduler/cleanup-jobs',
  InternalMiddleware,
  SchedulerController.cleanupJobs
);
```

---

## How It Works: Step-by-Step Example

### Scenario: 100 Matches on Saturday

#### **6:00 AM - Daily Job Creator Runs**

```
Railway Cron Trigger
    ↓
POST /internal/scheduler/create-daily-jobs
    ↓
```

**Today's matches in database:**

```
┌────────┬─────────────────┬──────────┬───────────────────────┐
│ Match  │ Tournament      │ Kickoff  │ Expected End (T+2h)   │
├────────┼─────────────────┼──────────┼───────────────────────┤
│ 1      │ Premier League  │ 12:30 PM │ 2:30 PM               │
│ 2      │ Premier League  │ 3:00 PM  │ 5:00 PM               │
│ 3      │ La Liga         │ 3:00 PM  │ 5:00 PM               │
│ 15     │ Serie A         │ 4:30 PM  │ 6:30 PM               │
│ ...    │ ...             │ ...      │ ...                   │
│ 100    │ Bundesliga      │ 9:00 PM  │ 11:00 PM              │
└────────┴─────────────────┴──────────┴───────────────────────┘
```

**API Logic:**
```typescript
async function createDailyJobs() {
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  // Get all matches happening today
  const todaysMatches = await db
    .select()
    .from(T_Match)
    .where(
      and(
        gte(T_Match.date, todayStart),
        lte(T_Match.date, todayEnd),
        eq(T_Match.status, 'notstarted')
      )
    );

  console.log(`Found ${todaysMatches.length} matches today`);

  // Create a job for each match (scheduled for kickoff + 2 hours)
  const jobs = todaysMatches.map(match => {
    const kickoffTime = new Date(match.date + ' ' + match.time);
    const updateTime = new Date(kickoffTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    return {
      tournamentId: match.tournamentId,
      matchId: match.id,
      roundSlug: match.roundSlug,
      jobType: 'UPDATE_MATCH_SCORES',
      scheduledFor: updateTime,
      status: 'pending'
    };
  });

  await db.insert(T_ScheduledJob).values(jobs);

  console.log(`Created ${jobs.length} scheduled jobs`);
  return { created: jobs.length };
}
```

**Result: Database now contains:**

```sql
INSERT INTO scheduled_job (match_id, tournament_id, round_slug, scheduled_for, status)
VALUES
  ('match-1', 'premier-league', 'round-15', '2024-11-30 14:30:00', 'pending'),
  ('match-2', 'premier-league', 'round-15', '2024-11-30 17:00:00', 'pending'),
  ('match-3', 'la-liga', 'round-10', '2024-11-30 17:00:00', 'pending'),
  ...
  ('match-100', 'bundesliga', 'round-8', '2024-11-30 23:00:00', 'pending');

-- Result: 100 records, all status='pending'
```

---

#### **2:30 PM - First Jobs Become Due**

```
Railway Cron Trigger (runs every 5 minutes)
    ↓
POST /internal/scheduler/process-jobs
    ↓
```

**Current time:** 2:30 PM

**Query executed:**
```sql
SELECT * FROM scheduled_job
WHERE status = 'pending'
  AND scheduled_for <= '2024-11-30 14:30:00'
ORDER BY scheduled_for ASC;
```

**Results:**
```
┌────────────┬──────────────────┬──────────┬─────────────────────┬──────────┐
│ Match ID   │ Tournament       │ Round    │ Scheduled For       │ Status   │
├────────────┼──────────────────┼──────────┼─────────────────────┼──────────┤
│ match-1    │ premier-league   │ round-15 │ 2024-11-30 14:30:00 │ pending  │
└────────────┴──────────────────┴──────────┴─────────────────────┴──────────┘
```

**Processing:**
```typescript
async function processJobs() {
  const now = new Date();

  const dueJobs = await db
    .select()
    .from(T_ScheduledJob)
    .where(
      and(
        eq(T_ScheduledJob.status, 'pending'),
        lte(T_ScheduledJob.scheduledFor, now)
      )
    )
    .orderBy(asc(T_ScheduledJob.scheduledFor))
    .limit(50); // Process max 50 at once

  console.log(`Found ${dueJobs.length} jobs to process`);

  for (const job of dueJobs) {
    try {
      // 1. Update match scores for this round
      await AdminMatchesService.updateMatchesByRound({
        tournamentId: job.tournamentId,
        roundSlug: job.roundSlug
      });

      // 2. Update tournament standings
      await AdminStandingsService.update({
        tournamentId: job.tournamentId
      });

      // 3. Mark job as completed
      await db
        .update(T_ScheduledJob)
        .set({
          status: 'completed',
          executedAt: new Date()
        })
        .where(eq(T_ScheduledJob.id, job.id));

      console.log(`✅ Completed job ${job.id} for match ${job.matchId}`);

    } catch (error) {
      // Mark as failed with error details
      await db
        .update(T_ScheduledJob)
        .set({
          status: 'failed',
          error: error.message,
          executedAt: new Date()
        })
        .where(eq(T_ScheduledJob.id, job.id));

      console.error(`❌ Failed job ${job.id}:`, error);
    }
  }

  return { processed: dueJobs.length };
}
```

**After processing:**
```
┌────────────┬──────────────────┬──────────┬─────────────────────┬───────────┐
│ Match ID   │ Tournament       │ Round    │ Scheduled For       │ Status    │
├────────────┼──────────────────┼──────────┼─────────────────────┼───────────┤
│ match-1    │ premier-league   │ round-15 │ 2024-11-30 14:30:00 │ completed │ ✅
└────────────┴──────────────────┴──────────┴─────────────────────┴───────────┘
```

---

#### **2:35 PM - Cron Runs Again**

**Current time:** 2:35 PM

**Query executed:**
```sql
SELECT * FROM scheduled_job
WHERE status = 'pending'
  AND scheduled_for <= '2024-11-30 14:35:00';
```

**Results:** `EMPTY` (match-1 already completed)

**Action:** Nothing to do, returns immediately

---

#### **5:00 PM - Multiple Jobs Due**

**Current time:** 5:00 PM

**Query executed:**
```sql
SELECT * FROM scheduled_job
WHERE status = 'pending'
  AND scheduled_for <= '2024-11-30 17:00:00';
```

**Results:**
```
┌────────────┬──────────────────┬──────────┬─────────────────────┬──────────┐
│ Match ID   │ Tournament       │ Round    │ Scheduled For       │ Status   │
├────────────┼──────────────────┼──────────┼─────────────────────┼──────────┤
│ match-2    │ premier-league   │ round-15 │ 2024-11-30 17:00:00 │ pending  │
│ match-3    │ la-liga          │ round-10 │ 2024-11-30 17:00:00 │ pending  │
│ match-15   │ serie-a          │ round-3  │ 2024-11-30 16:45:00 │ pending  │
└────────────┴──────────────────┴──────────┴─────────────────────┴──────────┘
```

**Note:** Match 15 was delayed but is now past its scheduled time, so it gets processed!

**Processing:** Loops through each job
1. Update match-2 scores + standings → Mark completed ✅
2. Update match-3 scores + standings → Mark completed ✅
3. Update match-15 scores + standings → Mark completed ✅

**After processing:**
```
┌────────────┬──────────────────┬──────────┬─────────────────────┬───────────┐
│ Match ID   │ Tournament       │ Round    │ Scheduled For       │ Status    │
├────────────┼──────────────────┼──────────┼─────────────────────┼───────────┤
│ match-2    │ premier-league   │ round-15 │ 2024-11-30 17:00:00 │ completed │ ✅
│ match-3    │ la-liga          │ round-10 │ 2024-11-30 17:00:00 │ completed │ ✅
│ match-15   │ serie-a          │ round-3  │ 2024-11-30 16:45:00 │ completed │ ✅
└────────────┴──────────────────┴──────────┴─────────────────────┴───────────┘
```

---

#### **11:00 PM - Last Matches**

**Current time:** 11:00 PM

**Query:**
```sql
SELECT * FROM scheduled_job
WHERE status = 'pending'
  AND scheduled_for <= '2024-11-30 23:00:00';
```

**Results:** All remaining pending jobs scheduled for ≤ 11:00 PM

**Processing:** Updates all final matches of the day

---

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   6:00 AM DAILY - CREATE JOBS                    │
│   POST /internal/scheduler/create-daily-jobs                    │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              Query: Get today's matches from T_Match
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │     CREATE SCHEDULED JOBS             │
         │                                       │
         │  For each match:                      │
         │  - Calculate: kickoff + 2 hours       │
         │  - Insert into T_ScheduledJob         │
         │  - Status: 'pending'                  │
         └───────────────────────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │      T_ScheduledJob Table             │
         ├───────────────────────────────────────┤
         │  match-1  | 2:30 PM  | pending        │
         │  match-2  | 5:00 PM  | pending        │
         │  match-3  | 5:00 PM  | pending        │
         │  ...                                   │
         │  match-100| 11:00 PM | pending        │
         └───────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│          EVERY 5 MINUTES - PROCESS DUE JOBS                      │
│          POST /internal/scheduler/process-jobs                   │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              Query: SELECT WHERE status='pending'
                     AND scheduledFor <= NOW()
                             │
         ┌───────────────────┴──────────────────┐
         │                                       │
         ▼                                       ▼
    No jobs due                            Jobs found!
    (return)                                    │
                                                ▼
                                   FOR EACH job (max 50):
                                                │
                              ┌─────────────────┴─────────────────┐
                              │                                   │
                              ▼                                   ▼
                        TRY: Update                         CATCH: Error
                              │                                   │
                    ┌─────────┴─────────┐                        │
                    │                   │                        │
                    ▼                   ▼                        ▼
         Update match scores    Update standings      Mark as 'failed'
         (Admin API)            (Admin API)           Store error message
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    Mark as 'completed'
                    Set executedAt = NOW()
                              │
                              ▼
         ┌───────────────────────────────────────┐
         │      T_ScheduledJob Table             │
         ├───────────────────────────────────────┤
         │  match-1  | 2:30 PM  | completed  ✅  │
         │  match-2  | 5:00 PM  | pending        │
         │  match-3  | 5:00 PM  | pending        │
         │  ...                                   │
         └───────────────────────────────────────┘
                              │
                              ▼
                      (Repeat every 5 min)


┌──────────────────────────────────────────────────────────────────┐
│               MIDNIGHT DAILY - CLEANUP OLD JOBS                  │
│               POST /internal/scheduler/cleanup-jobs              │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              DELETE FROM T_ScheduledJob
              WHERE status IN ('completed', 'failed')
                AND executedAt < NOW() - INTERVAL '7 days'
                             │
                             ▼
                    Keeps database clean
```

---

## Key Features

### 1. Smart Filtering

**Only processes jobs that are actually due:**

```typescript
const dueJobs = await db
  .select()
  .from(T_ScheduledJob)
  .where(
    and(
      eq(T_ScheduledJob.status, 'pending'),          // Not already done
      lte(T_ScheduledJob.scheduledFor, new Date())   // Time has passed
    )
  )
  .orderBy(asc(T_ScheduledJob.scheduledFor));
```

**Timeline example (current time: 3:15 PM):**
```
Jobs in database:
├─ 2:30 PM ✅ DUE (processes)
├─ 3:00 PM ✅ DUE (processes)
├─ 3:15 PM ✅ DUE (processes)
├─ 5:00 PM ❌ FUTURE (skips)
└─ 7:00 PM ❌ FUTURE (skips)
```

### 2. Automatic Batching

If 10 matches all end at 5:00 PM, they're all processed in one run:

```
5:00 PM cron run:
├─ Query finds 10 pending jobs
├─ Processes all 10 sequentially
└─ Total time: ~2-3 minutes for all 10
```

### 3. Error Resilience

If a job fails, it stays `pending` and retries:

```
5:00 PM - Job fails (network error)
    ↓
    Status: 'failed', error stored
    ↓
5:05 PM - Admin manually resets to 'pending'
    ↓
5:10 PM - Job retries and succeeds
```

### 4. Visibility & Debugging

**See all pending jobs:**
```sql
SELECT * FROM scheduled_job
WHERE status = 'pending'
ORDER BY scheduled_for;
```

**See failed jobs:**
```sql
SELECT match_id, scheduled_for, error
FROM scheduled_job
WHERE status = 'failed'
ORDER BY scheduled_for DESC;
```

**See today's execution history:**
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (executed_at - created_at))) as avg_delay_seconds
FROM scheduled_job
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

### 5. Manual Control

**Admin can manually trigger a job:**
```sql
-- Reset a failed job to retry
UPDATE scheduled_job
SET status = 'pending', error = NULL
WHERE id = 'job-uuid';

-- Force immediate execution
UPDATE scheduled_job
SET scheduled_for = NOW()
WHERE match_id = 'match-123';

-- Cancel a job
DELETE FROM scheduled_job
WHERE id = 'job-uuid';
```

---

## Handling 100 Matches/Day

### Performance Analysis

**Assumptions:**
- 100 matches total
- Distributed over 12 hours (12 PM - 12 AM)
- Average 8 matches/hour

**Peak load scenario:** 15 matches ending at same time (5 PM)

```
5:00 PM cron run:
├─ Query: ~10ms
├─ Process 15 jobs × 2 seconds each = 30 seconds
├─ Total: ~30 seconds (well within 5-min window)
└─ Next run at 5:05 PM proceeds normally
```

**Daily stats:**
- Cron runs: 288 times/day (every 5 min × 24 hours)
- Jobs created: 100 (once at 6 AM)
- Jobs processed: 100 (throughout the day)
- Empty runs: ~188 (nothing to do)

**Database load:**
- 100 inserts/day (6 AM)
- 288 queries/day (every 5 min)
- 100 updates/day (mark completed)
- Total: ~488 operations/day = **negligible**

### Scaling Considerations

**What if we had 1,000 matches/day?**

Option A: Increase cron frequency
```json
{
  "schedule": "*/2 * * * *"  // Every 2 minutes instead of 5
}
```

Option B: Process in larger batches
```typescript
.limit(100)  // Instead of 50
```

Option C: Parallel processing
```typescript
await Promise.all(
  dueJobs.map(job => processJob(job))
);
```

**Railway limits:**
- Max cron frequency: 5 minutes ✅ (perfect for us)
- Max execution time: Depends on plan (usually 10+ minutes) ✅
- Memory/CPU: Standard limits apply ✅

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `T_ScheduledJob` table migration
- [ ] Add index on `(status, scheduled_for)`
- [ ] Test schema with sample data

### Phase 2: API Endpoints
- [ ] Create `/internal/scheduler/create-daily-jobs` endpoint
- [ ] Create `/internal/scheduler/process-jobs` endpoint
- [ ] Create `/internal/scheduler/cleanup-jobs` endpoint
- [ ] Add `InternalMiddleware` authentication
- [ ] Test endpoints manually with Postman/curl

### Phase 3: Business Logic
- [ ] Implement `createDailyJobs()` service
  - [ ] Query today's matches
  - [ ] Calculate scheduled times (kickoff + 2h)
  - [ ] Bulk insert jobs
- [ ] Implement `processJobs()` service
  - [ ] Query due jobs
  - [ ] Call admin services to update scores/standings
  - [ ] Handle errors gracefully
  - [ ] Mark jobs as completed/failed
- [ ] Implement `cleanupJobs()` service
  - [ ] Delete old completed jobs (>7 days)

### Phase 4: Railway Configuration
- [ ] Configure Railway cron jobs
  - [ ] Daily at 6 AM: create-daily-jobs
  - [ ] Every 5 min: process-jobs
  - [ ] Daily at midnight: cleanup-jobs
- [ ] Set `INTERNAL_SERVICE_TOKEN` environment variable
- [ ] Test cron execution in Railway logs

### Phase 5: Monitoring & Testing
- [ ] Add logging to all endpoints
- [ ] Monitor Railway logs for cron execution
- [ ] Create admin UI to view scheduled jobs (optional)
- [ ] Test with real tournament data
- [ ] Verify matches update correctly

---

## Benefits Summary

### ✅ Pros

1. **Simple Architecture**
   - Everything in one codebase
   - No Lambda/EventBridge complexity
   - Easy to understand and debug

2. **Cost-Effective**
   - Free with Railway
   - No AWS Lambda costs
   - No EventBridge costs

3. **Developer-Friendly**
   - Local development possible
   - Standard API testing
   - Familiar tech stack

4. **Visible & Debuggable**
   - Database queries show job status
   - Railway logs show execution
   - Can manually inspect/fix jobs

5. **Resilient**
   - Auto-retry failed jobs
   - Graceful error handling
   - No lost updates

6. **Flexible**
   - Easy to adjust timing
   - Can manually trigger jobs
   - Admin control over schedule

7. **Scalable**
   - Handles 100+ matches/day easily
   - Can batch process multiple jobs
   - Database indexing keeps queries fast

### ⚠️ Cons

1. **Timing Precision**
   - 5-minute intervals (not exact timing)
   - Could be up to 5 minutes late
   - **Acceptable for our use case** (matches last 90+ min)

2. **Railway Dependency**
   - Requires Railway cron support
   - Platform lock-in (but easy to migrate)

3. **Database Cleanup**
   - Need to manage old job records
   - Minimal impact (delete is fast)

---

## Comparison with Old Lambda Approach

| Aspect               | Old (AWS Lambda)           | New (Railway Queue)      |
|----------------------|----------------------------|--------------------------|
| **Complexity**       | High (Lambda + EventBridge)| Low (DB + API)           |
| **Debugging**        | Hard (CloudWatch)          | Easy (Railway logs)      |
| **Cost**             | AWS charges                | Free with Railway        |
| **Timing Precision** | Exact (EventBridge)        | 5-min intervals          |
| **Visibility**       | AWS Console                | Database queries         |
| **Local Testing**    | Difficult                  | Easy                     |
| **Deployment**       | GitHub Actions complex     | Simple API deploy        |
| **Maintenance**      | Schedule management        | DB records               |

---

## Next Steps

1. **Verify Railway Cron Support**
   - Check Railway docs/dashboard
   - Confirm minimum 5-minute interval

2. **Prototype Implementation**
   - Create database schema
   - Build one endpoint
   - Test manually

3. **Compare with Option 2** (AWS EventBridge direct HTTP)
   - Evaluate if exact timing is needed
   - Consider hybrid approach

---

## Questions & Considerations

1. **Is 5-minute precision acceptable?**
   - Matches last 90+ minutes
   - 2-5 minute delay is negligible
   - Users won't notice

2. **What if Railway cron fails?**
   - Jobs stay in queue (pending)
   - Next run processes them
   - Auto-recovery built-in

3. **How to handle very delayed matches?**
   - Job stays pending
   - Processes whenever match actually ends
   - Admin can manually trigger update

4. **Database size concerns?**
   - 100 jobs/day × 365 days = 36,500 records/year
   - With cleanup: ~700 records (7 days retention)
   - Negligible storage impact

---

## File Structure

```
src/
├── domains/
│   └── scheduler/
│       ├── routes/
│       │   └── internal.ts          # Cron endpoints
│       ├── services/
│       │   ├── create-jobs.ts       # Daily job creation
│       │   ├── process-jobs.ts      # Job processor
│       │   └── cleanup-jobs.ts      # Old job cleanup
│       ├── schema/
│       │   └── index.ts             # T_ScheduledJob schema
│       └── queries/
│           └── index.ts             # Database queries
│
└── domains/
    └── auth/
        └── internal-middleware.ts   # X-Internal-Token auth

railway.json  # Cron configuration
```

---

## Conclusion

**Option 1: Railway Job Queue** is the recommended approach because:

1. ✅ **Simplest to implement and maintain**
2. ✅ **No additional infrastructure**
3. ✅ **Easy to debug and monitor**
4. ✅ **Handles 100+ matches/day easily**
5. ✅ **5-minute precision is acceptable**

The database-backed queue approach provides the perfect balance of simplicity, reliability, and maintainability for automated match updates.
