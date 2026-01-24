# Scheduler Admin API

Manual triggers and monitoring for the automated match update system.

## Overview

The scheduler supports two processing modes:
- **Concurrent Mode (Queue-based):** 10 workers process matches in parallel using pg-boss queue
- **Sequential Mode (Fallback):** Matches processed one-by-one when queue is unavailable

The system automatically routes to the best available mode with graceful degradation.

### Performance Characteristics

| Mode | Processing Time (200 matches) | Workers | Use Case |
|------|-------------------------------|---------|----------|
| **Concurrent** | ~2 minutes | 10 parallel workers | Production (default) |
| **Sequential** | ~17 minutes | Single-threaded | Fallback when queue unavailable |

### Queue Configuration

- **Queue System:** pg-boss (PostgreSQL-based)
- **Workers:** 10 concurrent workers
- **Concurrency:** 1 job per worker
- **Retry Policy:** 3 attempts with exponential backoff (30s → 60s → 120s)
- **Job Expiration:** 2 hours

---

## Endpoints

### 1. Trigger Match Polling (Manual)

**POST** `/api/v2/admin/scheduler/trigger-match-polling`

Manually trigger the match update process without waiting for the cron schedule.

**Processing Mode:**
- Automatically uses queue-based processing if available (concurrent)
- Falls back to sequential processing if queue unavailable

**Use Cases:**
- Testing the scheduler logic locally
- Forcing an immediate update in production
- Debugging match update issues

**Authentication:** Requires admin JWT token

**Request:**
```bash
curl -X POST http://localhost:9090/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response (Success - Concurrent Mode):**
```json
{
  "success": true,
  "message": "Match polling completed successfully",
  "data": {
    "processingMode": "concurrent",
    "statsBefore": {
      "totalOpenMatches": 218,
      "matchesNeedingUpdate": 15,
      "matchesRecentlyChecked": 0
    },
    "results": {
      "processed": 15,
      "queued": 15
    },
    "message": "Jobs queued for concurrent processing by background workers",
    "duration": "0.25s",
    "timestamp": "2026-01-24T15:30:00.000Z"
  }
}
```

**Response (Success - Sequential Mode):**
```json
{
  "success": true,
  "message": "Match polling completed successfully",
  "data": {
    "processingMode": "sequential",
    "statsBefore": {
      "totalOpenMatches": 218,
      "matchesNeedingUpdate": 4,
      "matchesRecentlyChecked": 0
    },
    "results": {
      "processed": 4,
      "successful": 4,
      "failed": 0,
      "standingsUpdated": 2
    },
    "message": "Processed sequentially",
    "duration": "45.32s",
    "timestamp": "2026-01-24T15:30:00.000Z"
  }
}
```

**Note:** Concurrent mode returns immediately after queueing jobs. Workers process jobs in the background.

**Response (Error):**
```json
{
  "success": false,
  "error": "Match polling failed",
  "details": "Browser failed to initialize",
  "timestamp": "2026-01-21T15:30:00.000Z"
}
```

---

### 2. Get Polling Stats

**GET** `/api/v2/admin/scheduler/stats`

Get current statistics about matches that need updates.

**Use Cases:**
- Check how many matches are pending updates
- Monitor system health
- Verify polling logic is working

**Authentication:** Requires admin JWT token

**Request:**
```bash
curl -X GET http://localhost:9090/api/v2/admin/scheduler/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Polling stats retrieved successfully",
  "data": {
    "totalOpenMatches": 218,
    "matchesNeedingUpdate": 4,
    "matchesRecentlyChecked": 0
  },
  "timestamp": "2026-01-21T15:30:00.000Z"
}
```

---

### 3. Get Queue Stats

**GET** `/api/v2/admin/scheduler/queue-stats`

Get queue health and statistics including pending jobs, worker count, and retry policy.

**Use Cases:**
- Monitor queue health
- Check pending job count
- Verify queue is running
- Debug performance issues

**Authentication:** Requires admin JWT token

**Request:**
```bash
curl -X GET http://localhost:9090/api/v2/admin/scheduler/queue-stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response (Queue Available):**
```json
{
  "success": true,
  "message": "Queue stats retrieved successfully",
  "data": {
    "available": true,
    "mode": "concurrent",
    "queue": {
      "name": "update-match",
      "pendingJobs": 15
    },
    "workers": {
      "count": 10,
      "concurrency": 1
    },
    "retryPolicy": {
      "attempts": 3,
      "backoff": "exponential",
      "delays": "30s → 60s → 120s"
    }
  },
  "timestamp": "2026-01-24T15:30:00.000Z"
}
```

**Response (Queue Unavailable):**
```json
{
  "success": true,
  "message": "Queue service unavailable",
  "data": {
    "available": false,
    "mode": "sequential",
    "message": "System is using sequential processing (queue not initialized)"
  },
  "timestamp": "2026-01-24T15:30:00.000Z"
}
```

---

### 4. Get Job Status

**GET** `/api/v2/admin/scheduler/jobs/:jobId`

Track the status of a specific job by its ID.

**Use Cases:**
- Monitor manually triggered jobs
- Debug failed jobs
- Track job progress
- Get job duration and timing

**Authentication:** Requires admin JWT token

**Path Parameters:**
- `jobId` (string): The unique job identifier

**Request:**
```bash
curl -X GET http://localhost:9090/api/v2/admin/scheduler/jobs/abc-123-def-456 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "abc-123-def-456",
    "state": "completed",
    "matchId": "match-789",
    "matchExternalId": "12345678",
    "tournamentId": "tournament-xyz",
    "createdOn": "2026-01-24T10:00:00.000Z",
    "startedOn": "2026-01-24T10:00:05.000Z",
    "completedOn": "2026-01-24T10:00:10.000Z",
    "duration": "5.00s"
  },
  "timestamp": "2026-01-24T15:30:00.000Z"
}
```

**Response (Job Not Found):**
```json
{
  "success": false,
  "error": "Job not found",
  "message": "No job found with ID: abc-123-def-456",
  "timestamp": "2026-01-24T15:30:00.000Z"
}
```

**Response (Queue Unavailable):**
```json
{
  "success": false,
  "error": "Queue service unavailable",
  "message": "Queue is not initialized",
  "timestamp": "2026-01-24T15:30:00.000Z"
}
```

**Job States:**
- `created`: Job queued, waiting for worker
- `active`: Job currently being processed
- `completed`: Job finished successfully
- `failed`: Job failed after all retries
- `retry`: Job failed, will be retried

---

## Queue-Based Processing Architecture

### How It Works

1. **Cron Schedule Triggers** (every 10 minutes)
2. **Orchestrator finds matches needing updates**
3. **Jobs are queued** (one job per match)
4. **10 workers process jobs concurrently**
5. **Each job updates a match** (with retry logic)
6. **Scoreboard updated when match ends**
7. **Standings updated for affected tournaments**

### Job Lifecycle

```
Created → Active → Completed
           ↓
        Failed → Retry (up to 3 attempts)
                  ↓
               Failed (final)
```

### Retry Behavior

- **Attempt 1:** Immediate processing
- **Attempt 2:** 30 seconds after first failure
- **Attempt 3:** 60 seconds after second failure
- **Attempt 4:** 120 seconds after third failure
- **Final:** Job marked as failed

### Concurrent Safety

**PostgreSQL:**
- Uses atomic increment operations (`points = points + delta`)
- Row-level locking prevents race conditions
- Multiple workers can safely update same tournament

**Redis:**
- Uses atomic `ZINCRBY` commands for sorted sets
- Single-threaded execution ensures consistency
- Concurrent updates are serialized automatically

**Result:** 10 workers can safely process matches from the same tournament simultaneously.

---

## Scoreboard Integration

The scheduler automatically updates the scoreboard when matches end. This process is integrated directly into match processing.

### Match End → Scoreboard Flow

When a match transitions to "ended" status:

1. **Calculate Points**
   - Fetch all guesses for the match
   - Run guess analysis for each guess
   - Calculate points earned per member

2. **Dual-Write Updates** (Atomic Operations)
   - **PostgreSQL:** Bulk update `T_TournamentMember.points` using atomic increment
   - **Redis:** Update `tournament:{id}:master_scores` using `ZINCRBY`

3. **Update Standings**
   - Refresh tournament standings from latest match results
   - Skip for knockout-only tournaments

### Atomic Operations (Concurrency Safe)

**PostgreSQL:**
```sql
UPDATE T_TournamentMember AS tm
SET points = tm.points + delta  -- Atomic increment
FROM (
  SELECT member_id, delta FROM updates
) AS data
WHERE tm.member_id = data.member_id
  AND tm.tournament_id = :tournamentId
```

**Redis:**
```bash
ZINCRBY tournament:123:master_scores 5 member-abc  # Atomic
```

### Error Handling

- **Scoreboard errors are swallowed** (logged but don't break match processing)
- **Match update job completes successfully** even if scoreboard fails
- **Allows system to continue processing** other matches
- **Errors logged for monitoring** (Sentry integration recommended)

**Why this pattern:**
- Match data is more critical than scoreboard updates
- Scoreboard can be recalculated manually if needed
- System resilience over strict consistency

---

## Troubleshooting

### Queue Issues

#### Symptom: Jobs not processing (pending count keeps growing)

**Possible Causes:**
1. Queue workers not started
2. Database connection issues
3. pg-boss schema not created

**Diagnosis:**
```bash
# Check queue stats
curl GET .../scheduler/queue-stats -H "Authorization: Bearer TOKEN"

# Check scheduler service logs (Railway)
railway logs --service scheduler
```

**Fix:**
- Verify `MATCH_POLLING_ENABLED=true` in environment
- Check DATABASE_URL is correct
- Restart scheduler service

---

#### Symptom: All jobs failing with retry

**Possible Causes:**
1. SofaScore API down or blocking requests
2. Browser initialization failures (Playwright)
3. Database connection errors

**Diagnosis:**
```bash
# Check specific job status
curl GET .../scheduler/jobs/JOB_ID -H "Authorization: Bearer TOKEN"

# Check scheduler logs for error details
railway logs --service scheduler --filter "Failed to process match"
```

**Fix:**
- Check SofaScore API availability
- Verify Playwright is installed: `npx playwright install chromium`
- Check DATABASE_URL and Redis connection

---

#### Symptom: Queue showing as unavailable

**Possible Causes:**
1. Queue service failed to initialize
2. PostgreSQL connection issues
3. pg-boss schema missing

**Diagnosis:**
```bash
# Check queue stats
curl GET .../scheduler/queue-stats

# Check startup logs
railway logs --service scheduler --filter "Queue"
```

**Fix:**
- Verify DATABASE_URL in environment variables
- Check PostgreSQL is accessible
- Restart scheduler service to reinitialize

---

### Scoreboard Issues

#### Symptom: Match updated but scoreboard not reflecting changes

**Diagnosis:**
```bash
# Check scheduler logs for scoreboard errors
railway logs --filter "Scoreboard update failed"

# Verify PostgreSQL points
SELECT * FROM "T_TournamentMember" WHERE tournament_id = :id;

# Verify Redis scores
redis-cli
> ZRANGE tournament:{id}:master_scores 0 -1 WITHSCORES
```

**Fix:**
- Check logs for specific error
- Verify Redis connection (REDIS_URL)
- Manually recalculate if needed (future admin endpoint)

---

#### Symptom: Concurrent workers causing duplicate scoreboard updates

**Diagnosis:**
This should NOT happen due to atomic operations, but if suspected:

```sql
-- Check for unexpected point values
SELECT member_id, points, updated_at
FROM "T_TournamentMember"
WHERE tournament_id = :id
ORDER BY updated_at DESC;
```

**Fix:**
- Atomic operations prevent this by design
- If occurring, check for code changes that broke atomic pattern
- Review recent deployments

---

### Performance Issues

#### Symptom: 200 matches taking longer than 3 minutes

**Possible Causes:**
1. SofaScore API slow to respond
2. Database connection pool exhausted
3. Workers not running concurrently

**Diagnosis:**
```bash
# Check queue stats
curl GET .../scheduler/queue-stats

# Check job processing times
# Look for jobs with long duration
```

**Fix:**
- Verify workers = 10 (check queue stats)
- Increase database connection pool if needed
- Check network latency to SofaScore

---

## Authentication

All endpoints require an **Admin JWT token**.

### Getting an Admin Token

**Method 1: Use existing admin auth endpoint**
```bash
# Login as admin (if you have admin login endpoint)
curl -X POST http://localhost:9090/api/v2/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

**Method 2: Generate manually (development only)**
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({ admin: true }, process.env.ADMIN_JWT_SECRET);
console.log(token);
```

---

## Testing Locally

### 1. Start the API
```bash
# Make sure database is running
docker compose up -d

# Start API
yarn dev
```

### 2. Get Admin Token
See authentication section above.

### 3. Test Stats Endpoint (Quick Check)
```bash
curl -X GET http://localhost:9090/api/v2/admin/scheduler/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Manual Trigger
```bash
curl -X POST http://localhost:9090/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected behavior:**
- Browser initializes (logs show "Initializing browser...")
- Orchestrator runs
- Matches are updated
- Execution records created in database
- Response shows stats and results
- Browser closes

---

## Production Usage

### Triggering Updates in Production

**Railway:**
```bash
# Get your production admin token first
# Then:
curl -X POST https://your-api.railway.app/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer YOUR_PRODUCTION_ADMIN_TOKEN"
```

**When to use:**
- Testing after deployment
- Emergency manual update (scheduler is down)
- Debugging production issues

### Monitoring

**Check scheduler health:**
```bash
curl -X GET https://your-api.railway.app/api/v2/admin/scheduler/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected response:**
- `matchesNeedingUpdate` should be low (< 10) if scheduler is running every 10 minutes
- If it's high (> 50), scheduler might not be running or cron is disabled

---

## Debugging

### Endpoint returns 401 Unauthorized

**Cause:** Invalid or missing admin JWT token

**Fix:**
1. Verify you're using the admin JWT secret (not regular JWT secret)
2. Check token hasn't expired
3. Ensure `Authorization: Bearer <token>` header is present

### Endpoint returns 500 Internal Server Error

**Check logs for:**
- Browser initialization failures (Playwright issues)
- Database connection errors
- Missing environment variables

**Common fixes:**
- Ensure Playwright is installed: `npx playwright install chromium`
- Verify database is accessible
- Check AWS credentials (for S3 reports)

### Manual trigger works but cron doesn't

**Possible causes:**
1. `MATCH_POLLING_ENABLED=false` in Railway
2. Scheduler service not deployed
3. Scheduler service crashed

**Fix:** Check Railway logs for scheduler service

---

## Rate Limiting

**Manual trigger endpoint:**
- No rate limiting currently
- But each execution takes 30-60 seconds
- Avoid triggering multiple times simultaneously

**Stats endpoint:**
- Lightweight (< 1 second)
- Safe to call frequently

---

## Security Considerations

1. **Admin-only access:** Both endpoints require admin JWT
2. **No public exposure:** Never expose admin endpoints publicly
3. **Production safety:** Manual trigger is safe - it just runs the same logic as the cron
4. **Browser resource usage:** Each trigger uses Playwright browser (memory-intensive)

---

## Example Workflows

### Workflow 1: Test After Code Changes

```bash
# 1. Deploy code changes
# 2. Check stats
curl GET .../scheduler/stats -H "Authorization: Bearer TOKEN"

# 3. Manually trigger to test
curl POST .../scheduler/trigger-match-polling -H "Authorization: Bearer TOKEN"

# 4. Verify in database
# Check data_provider_executions table for new records
```

### Workflow 2: Emergency Update

```bash
# Scheduler is down, matches need updating urgently
curl POST .../scheduler/trigger-match-polling -H "Authorization: Bearer TOKEN"

# Check results in response
# Verify matches updated in database
```

### Workflow 3: Debugging

```bash
# 1. Check current stats
curl GET .../scheduler/stats

# 2. Trigger manually and watch logs
curl POST .../scheduler/trigger-match-polling

# 3. Check execution table for errors
SELECT * FROM data_provider_executions ORDER BY started_at DESC LIMIT 5;
```

---

**Document Version:** 2.0
**Created:** January 21, 2026
**Last Updated:** January 24, 2026

**Changelog:**
- **v2.0 (Jan 24, 2026):** Added queue-based processing documentation, scoreboard integration flow, new endpoints (queue-stats, job-status), troubleshooting guide
- **v1.0 (Jan 21, 2026):** Initial documentation for manual triggers and polling stats
