# Option 1: Railway Job Queue - Implementation Strategy

## Overview

This is a **strategic guide** for implementing the database-backed job queue approach. Focus is on architecture, critical decisions, and potential pitfalls - NOT line-by-line code.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPLETE SYSTEM FLOW                        │
└─────────────────────────────────────────────────────────────┘

DATABASE LAYER
├─ scheduled_job table (job queue)
├─ match table (source of truth for today's matches)
└─ tournament/standings tables (updated by jobs)

API LAYER (Railway)
├─ POST /internal/scheduler/create-daily-jobs
│  └─ Reads match table → Creates scheduled_job records
├─ POST /internal/scheduler/process-jobs
│  └─ Reads scheduled_job → Calls AdminMatchesService + AdminStandingsService
└─ POST /internal/scheduler/cleanup-jobs
   └─ Deletes old scheduled_job records

RAILWAY CRON (Static schedules)
├─ 6:00 AM daily → curl create-daily-jobs
├─ Every 5 min → curl process-jobs
└─ Midnight daily → curl cleanup-jobs
```

---

## Critical Architectural Decisions

### 1. Database Table Design

**Key Decision:** Job queue lives in the database (NOT in-memory)

**Why:**
- Survives Railway restarts
- Queryable for debugging
- Acts as audit trail
- Enables manual intervention

**Critical Fields:**
- `scheduled_for` (TIMESTAMP WITH TIME ZONE) - **MUST** use timezone for match time + 2hrs calculation
- `status` (pending/completed/failed) - enables idempotency
- `round_slug` - **CRITICAL**: We update by round, not by individual match
- `match_id` - nullable (for future expansion to round-level jobs)

**Gotcha:** Timezone handling!
- Match times might be stored in local timezone
- scheduled_for MUST be in UTC (Railway runs in UTC)
- Conversion happens during job creation

---

### 2. Domain Structure: New Scheduler Domain

**Create:** `src/domains/scheduler/`

**Structure:**
```
scheduler/
├── schema/index.ts          (Drizzle schema for T_ScheduledJob)
├── queries/index.ts         (DB operations: create, getDue, markComplete, etc.)
├── services/index.ts        (Business logic: createDailyJobs, processJobs)
├── controllers/index.ts     (HTTP handlers)
└── routes/internal.ts       (Express routes with InternalMiddleware)
```

**Why separate domain?**
- Clear separation from admin/data-provider
- Reusable for future scheduling needs
- Easier to test in isolation

---

### 3. Integration Points with Existing Code

**CRITICAL:** The scheduler does NOT implement match updates - it CALLS existing services.

```
SchedulerService.executeJob()
  └─> AdminMatchesService.updateMatchesByRound()  [EXISTING]
  └─> AdminStandingsService.update()              [EXISTING]
```

**Verify these services exist and work:**
- `src/domains/admin/services/matches.ts` - updateMatchesByRound()
- `src/domains/admin/services/standings.ts` - update()

**Gotcha:** These services might expect Express Request/Response objects
- Solution: Create mock req/res OR refactor services to accept plain params
- Document in service layer if refactoring is needed

---

### 4. Railway Cron Configuration

**Platform:** Railway Dashboard → Service → Settings → Cron Jobs

**Critical Understanding:**
- Railway cron jobs run as **separate processes** (not part of your main API)
- They execute a shell command (curl in our case)
- They must authenticate (X-Internal-Token header)
- They timeout after ~10 minutes (Railway default)

**Cron Schedule Format:** Standard cron syntax
- `0 6 * * *` - Daily at 6 AM UTC
- `*/5 * * * *` - Every 5 minutes
- `0 0 * * *` - Midnight UTC

**Gotcha:** Railway minimum interval is 5 minutes
- Cannot do "every minute" if needed
- This is acceptable for football (matches are 90+ min)

---

## Implementation Phases (High-Level)

### Phase 1: Database Foundation
**Objective:** Create the job queue table

**Deliverables:**
- SQL migration file
- Drizzle schema definition
- Export in central schema barrel

**Critical Checks:**
- ✅ Indexes on (status, scheduled_for) for query performance
- ✅ Timezone support for scheduled_for
- ✅ Status constraint (only 'pending', 'completed', 'failed')

---

### Phase 2: Query Layer
**Objective:** Abstract all DB operations for scheduled jobs

**Key Methods:**
- `createJobs(jobs[])` - Bulk insert
- `getDueJobs(limit)` - Get pending jobs where scheduled_for <= NOW
- `markJobCompleted(jobId)` - Update status + executed_at
- `markJobFailed(jobId, error)` - Update status + error message
- `deleteOldJobs(daysOld)` - Cleanup

**Critical Checks:**
- ✅ Use transactions where needed (bulk inserts)
- ✅ Efficient queries (use indexes)
- ✅ Limit clause to prevent processing 1000s of jobs at once

---

### Phase 3: Service Layer
**Objective:** Implement business logic

**Key Methods:**
- `createDailyJobs()` - Query match table for today → Create scheduled_job records
- `processJobs()` - Get due jobs → Execute each → Mark complete/failed
- `cleanupOldJobs()` - Delete old records

**Critical Logic:**

**createDailyJobs():**
1. Query `T_Match` for today's matches (`date = CURRENT_DATE AND status = 'notstarted'`)
2. For each match: Parse `date` + `time` → Add 2 hours → Create job
3. Bulk insert all jobs

**Gotcha:** Match time parsing
- Matches might have NULL time field (default to noon?)
- Date format might vary (YYYY-MM-DD vs ISO8601)
- Handle edge cases (match delayed, match cancelled)

**processJobs():**
1. Get due jobs (limit 50)
2. For each job:
   - Call AdminMatchesService.updateMatchesByRound()
   - Call AdminStandingsService.update()
   - Mark completed OR mark failed with error
3. Return summary (processed, successful, failed)

**Gotcha:** Error handling
- If AdminMatchesService fails, DON'T mark as completed
- Store error message for debugging
- Continue processing other jobs (don't fail entire batch)

---

### Phase 4: API Layer
**Objective:** Expose scheduler as HTTP endpoints

**Routes:**
```
POST /internal/scheduler/create-daily-jobs
POST /internal/scheduler/process-jobs
POST /internal/scheduler/cleanup-jobs
GET  /internal/scheduler/stats           (optional, for monitoring)
GET  /internal/scheduler/failed-jobs     (optional, for debugging)
```

**Critical:**
- ALL routes protected by `InternalMiddleware` (X-Internal-Token)
- Return JSON with success/error messages
- Include metrics in response (jobs created, processed, etc.)

**Gotcha:** Railway crons need clean HTTP responses
- Don't return 500 if "no jobs to process" - that's success!
- Return 200 with `{ success: true, processed: 0 }`

---

### Phase 5: Route Registration
**Objective:** Mount scheduler routes in main router

**File:** `src/router/index.ts`

**Add:**
```typescript
import { SchedulerInternalRoutes } from '@/domains/scheduler/routes/internal';
app.use('/internal/scheduler', SchedulerInternalRoutes);
```

**Critical Checks:**
- ✅ Routes mounted AFTER Express middleware (body-parser, etc.)
- ✅ InternalMiddleware is applied
- ✅ Test with curl before configuring Railway crons

---

### Phase 6: Railway Configuration
**Objective:** Set up static cron jobs in Railway dashboard

**Steps:**
1. Add environment variable: `INTERNAL_SERVICE_TOKEN=<random-string>`
2. Configure 3 cron jobs in Railway dashboard

**Cron 1: Daily Job Creator**
- Schedule: `0 6 * * *` (6 AM UTC)
- Command: `curl -X POST http://localhost:9090/internal/scheduler/create-daily-jobs -H "X-Internal-Token: $INTERNAL_SERVICE_TOKEN"`

**Cron 2: Job Processor**
- Schedule: `*/5 * * * *` (every 5 minutes)
- Command: `curl -X POST http://localhost:9090/internal/scheduler/process-jobs -H "X-Internal-Token: $INTERNAL_SERVICE_TOKEN"`

**Cron 3: Cleanup**
- Schedule: `0 0 * * *` (midnight UTC)
- Command: `curl -X POST http://localhost:9090/internal/scheduler/cleanup-jobs -H "X-Internal-Token: $INTERNAL_SERVICE_TOKEN"`

**Gotcha:** Railway variables in cron commands
- Use `$VARIABLE_NAME` NOT `${VARIABLE_NAME}`
- Test command locally first with actual token

---

## Testing Strategy

### Local Testing (Before Railway)

**1. Database Setup**
```bash
yarn db:migrate  # Run migration
yarn db:studio   # Verify table exists
```

**2. Create Test Matches**
- Insert matches into `match` table for today
- Ensure `date = CURRENT_DATE`, `status = 'notstarted'`, `time` is set

**3. Test Endpoints with curl**
```bash
# Create jobs
curl -X POST http://localhost:9090/internal/scheduler/create-daily-jobs \
  -H "X-Internal-Token: test-token"

# Verify in DB
SELECT * FROM scheduled_job;

# Force a job to be due (manually update scheduled_for)
UPDATE scheduled_job SET scheduled_for = NOW() - INTERVAL '1 minute' WHERE id = '...';

# Process jobs
curl -X POST http://localhost:9090/internal/scheduler/process-jobs \
  -H "X-Internal-Token: test-token"

# Check job was marked completed
SELECT status, executed_at FROM scheduled_job WHERE id = '...';
```

### Railway Testing (After Deployment)

**1. Deploy to Railway**
- Push code → Railway auto-deploys
- Run migration on production: `yarn db:migrate`

**2. Manual Trigger First**
- Use Railway console OR curl to trigger create-daily-jobs
- Verify jobs created in production DB

**3. Wait for 5-Minute Cron**
- Monitor Railway logs
- Should see "process-jobs" executing every 5 min

**4. Monitor for 24 Hours**
- Check failed jobs count
- Verify matches are being updated
- Check standings are correct

---

## Monitoring & Debugging

### Key Metrics to Track

**1. Job Creation (Daily at 6 AM)**
- How many jobs created?
- Does it match number of matches today?
- Any errors during creation?

**2. Job Processing (Every 5 Min)**
- How many jobs processed per run?
- Success vs failure rate
- Average execution time

**3. Job Failures**
- What's the error message?
- Which tournament/match is failing?
- Is it a transient error (network) or systemic (bad data)?

### Useful SQL Queries

**Today's Job Summary**
```sql
SELECT status, COUNT(*)
FROM scheduled_job
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

**Overdue Jobs (Should Have Been Processed)**
```sql
SELECT match_id, scheduled_for, AGE(NOW(), scheduled_for) as overdue_by
FROM scheduled_job
WHERE status = 'pending' AND scheduled_for < NOW()
ORDER BY scheduled_for;
```

**Failed Jobs**
```sql
SELECT match_id, error, executed_at
FROM scheduled_job
WHERE status = 'failed'
ORDER BY executed_at DESC
LIMIT 20;
```

### Railway Logs

**What to Look For:**
```
✅ [SCHEDULER] Creating daily jobs - matchesCount: 15, jobsCreated: 15
✅ [SCHEDULER] Processing jobs - jobsFound: 3
✅ [SCHEDULER] Job completed - jobId: xxx, matchId: match-1

❌ [SCHEDULER] Job failed - error: Network timeout
❌ [SCHEDULER] No matches today (might be expected on off-days)
```

---

## Potential Pitfalls & Solutions

### Pitfall 1: Timezone Confusion

**Problem:** Jobs execute at wrong time because match time is in local timezone but scheduled_for is UTC

**Solution:**
- Store ALL times in UTC in database
- Convert match times to UTC during job creation
- Document timezone expectations clearly

---

### Pitfall 2: AdminMatchesService Signature

**Problem:** AdminMatchesService.updateMatchesByRound() expects Express req/res objects, but scheduler doesn't have them

**Solution Option A:** Create mock req/res objects
```typescript
const mockReq = { params: { tournamentId, roundSlug } };
const mockRes = { status: () => ({ json: () => {} }) };
```

**Solution Option B:** Refactor AdminMatchesService to accept plain params
```typescript
// Before: updateMatchesByRound(req, res)
// After: updateMatchesByRound({ tournamentId, roundSlug })
```

**Recommendation:** Option B (cleaner architecture)

---

### Pitfall 3: Duplicate Jobs

**Problem:** create-daily-jobs runs twice (manual + cron), creating duplicate jobs for same match

**Solution:**
- Add unique constraint: `UNIQUE (match_id, scheduled_for)`
- OR check if job exists before creating
- OR use upsert logic

---

### Pitfall 4: Processing Takes > 5 Minutes

**Problem:** If you have 100 matches and each takes 5 seconds, processing takes 8+ minutes. Next cron runs before first finishes.

**Solution:**
- Process in batches (limit to 50 jobs per run)
- Add locking mechanism (status = 'processing' before marking complete)
- OR increase cron interval to 10 minutes
- Monitor execution time in logs

---

### Pitfall 5: Railway Restarts During Cron

**Problem:** Railway deploys new version at 2:30 PM, killing in-flight job processing

**Solution:**
- Jobs are idempotent (safe to re-run)
- Failed jobs stay as "pending", will be retried next cycle
- Monitor for jobs stuck in pending > 30 minutes
- Manual recovery: reset status to pending if needed

---

### Pitfall 6: Match Data Missing

**Problem:** Match exists in scheduled_job but was deleted from match table

**Solution:**
- Handle gracefully in executeJob()
- Mark job as failed with "Match not found" error
- Log for investigation
- Consider cascade delete or foreign key constraint

---

## Success Criteria

### Phase 1: Development
- ✅ Migration runs without errors
- ✅ Schema exports correctly
- ✅ curl tests work locally
- ✅ Jobs created for test matches
- ✅ Jobs processed successfully

### Phase 2: Staging/Production
- ✅ Railway crons appear in logs every 5 min
- ✅ Jobs created daily at 6 AM
- ✅ Matches updated 2 hours after kickoff
- ✅ Standings updated correctly
- ✅ No jobs stuck in "pending" > 1 hour
- ✅ Failed job rate < 5%

### Phase 3: Long-Term
- ✅ System runs autonomously for 1 week
- ✅ No manual intervention needed
- ✅ Cleanup runs successfully (no table bloat)
- ✅ Monitoring queries return expected data

---

## Rollback Plan

### If Things Go Wrong

**1. Disable Railway Crons**
- Go to Railway dashboard
- Pause all 3 cron jobs
- System stops creating/processing jobs

**2. Manual Processing**
- Query pending jobs
- Process manually via curl
- Fix underlying issue

**3. Database Rollback**
```sql
-- Clear all jobs
TRUNCATE TABLE scheduled_job;

-- OR just clear pending jobs
DELETE FROM scheduled_job WHERE status = 'pending';
```

**4. Revert to Old Lambda System**
- Re-enable EventBridge schedules
- Old Lambdas still exist in AWS
- No data loss (matches/standings persist)

---

## Migration from Old Lambda System

### Transition Strategy

**Option 1: Hard Cutover**
1. Deploy new Railway system
2. Test for 24 hours with crons paused
3. Disable AWS Lambdas + EventBridge
4. Enable Railway crons

**Option 2: Parallel Run**
1. Deploy new Railway system
2. Run BOTH systems for 1 week
3. Compare results (did both update same matches?)
4. Disable AWS system after confidence

**Recommendation:** Option 1 (simpler, cleaner)

### Cleanup After Migration

**AWS Resources to Remove:**
- Lambda functions (caller-daily-routine, caller-scores-and-standings, caller-knockouts-update)
- EventBridge schedules (dynamic crons)
- IAM roles/policies
- CloudWatch log groups

**Code to Remove/Archive:**
- `src/lambdas/*.mjs` files
- Lambda deployment scripts
- GitHub Actions for Lambda deployment (if exists)

---

## Summary Checklist

### Implementation Phases
- [ ] Phase 1: Create database migration + schema
- [ ] Phase 2: Write query layer (SchedulerQueries)
- [ ] Phase 3: Write service layer (SchedulerService)
- [ ] Phase 4: Write API controllers + routes
- [ ] Phase 5: Mount routes in main router
- [ ] Phase 6: Configure Railway cron jobs

### Testing Phases
- [ ] Test locally with curl
- [ ] Test on Railway (manual triggers)
- [ ] Monitor cron execution (24 hours)
- [ ] Verify matches updated correctly
- [ ] Check for failed jobs

### Production Readiness
- [ ] Monitoring queries ready
- [ ] Logging in place (Profiling.log)
- [ ] Error handling for all edge cases
- [ ] Documentation for manual recovery
- [ ] Rollback plan communicated to team

### Cleanup
- [ ] Disable AWS Lambda system
- [ ] Remove old Lambda code
- [ ] Archive migration docs
- [ ] Update deployment documentation

---

**Time Estimate:** 1-2 days for full implementation + 1 week monitoring

**Confidence Level:** High - straightforward database-backed queue pattern

**Risk Level:** Low - can rollback to Lambda system if needed
