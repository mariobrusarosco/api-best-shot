# Match Update Scheduler - Complete Guide

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Core Concepts](#2-core-concepts)
3. [Implementation Details](#3-implementation-details)
4. [API Reference](#4-api-reference)
5. [Deployment Guide](#5-deployment-guide)
6. [Operations & Monitoring](#6-operations--monitoring)
7. [Troubleshooting](#7-troubleshooting)
8. [Migration History & Decisions](#8-migration-history--decisions)
9. [Appendices](#appendices)

---

## 1. Overview & Architecture

### System Purpose

The Match Update Scheduler is an automated system that polls and updates match data from external sources (SofaScore) at regular intervals. It maintains live scores, updates scoreboards, and refreshes tournament standings for the Best Shot football prediction application.

### Processing Modes

The scheduler supports two processing modes with automatic fallback:

| Mode | Processing Time (200 matches) | Workers | Use Case |
|------|-------------------------------|---------|----------|
| **Concurrent** | ~2 minutes | 10 parallel workers | Production (default) |
| **Sequential** | ~17 minutes | Single-threaded | Fallback when queue unavailable |

The system automatically routes to the best available mode with graceful degradation.

### High-Level Architecture

```mermaid
graph TD
    A[Cron Trigger<br/>Every 10 min] --> B[Match Orchestrator]
    B --> C{Queue Available?}
    C -->|Yes| D[Queue Jobs<br/>pg-boss]
    C -->|No| E[Sequential<br/>Processing]
    D --> F[10 Workers<br/>Process Matches]
    E --> G[Single Thread<br/>Process Matches]
    F --> H[Update Match Data<br/>via SofaScore]
    G --> H
    H --> I[Match Ended?]
    I -->|Yes| J[Calculate Points &<br/>Update Scoreboard]
    I -->|No| K[Skip Scoreboard]
    J --> L[Update Standings]
    K --> M[Complete]
    L --> M
```

### Service Architecture

```
Railway Project: api-best-shot
├── Service 1: API (existing)
│   └── Handles HTTP requests, admin endpoints
└── Service 2: Scheduler (separate service)
    └── Runs automated match updates via cron
```

**Why separate services:**
- Scheduler crashes don't affect API uptime
- Independent resource limits (Playwright needs more memory)
- Separate logs for easier debugging
- Independent deployments
- Better kill switch control

---

## 2. Core Concepts

### Job Queue Fundamentals

The scheduler uses **pg-boss** for job queue management:

```
WITHOUT A QUEUE (Sequential):
Cron → Find 100 matches → Process #1 → Process #2 → ... → Process #100
                           (5 sec)      (5 sec)           (5 sec)
                           Total: ~500 seconds (8+ minutes)

WITH A QUEUE (Concurrent):
Cron → Find 100 matches → Queue 100 jobs → 10 workers process in parallel
                                            Total: ~50 seconds (< 1 minute)
```

**Why pg-boss over other queues:**
- Uses existing PostgreSQL database (no extra infrastructure)
- Zero additional cost (vs Redis-based queues at $5-15/month)
- Transactional safety (ACID compliant)
- Built-in retry logic with exponential backoff

### Queue Configuration

- **Queue System:** pg-boss (PostgreSQL-based)
- **Queue Schema:** `pgboss` (auto-created on first run)
- **Queue Name:** `update-match`
- **Workers:** 10 concurrent workers
- **Concurrency:** 1 job per worker
- **Retry Policy:** 3 attempts with exponential backoff (30s → 60s → 120s)
- **Job Expiration:** 2 hours

### Job Lifecycle

```
Created → Active → Completed
           ↓
        Failed → Retry (up to 3 attempts)
                  ↓
               Failed (final)
```

### Scoreboard Integration

The scheduler automatically updates scoreboards when matches end using atomic operations for concurrent safety:

**PostgreSQL (Atomic Increment):**
```sql
UPDATE T_TournamentMember AS tm
SET points = tm.points + delta  -- Atomic increment
WHERE tm.member_id = :memberId
  AND tm.tournament_id = :tournamentId
```

**Redis (Atomic ZINCRBY):**
```bash
ZINCRBY tournament:123:master_scores 5 member-abc  # Atomic operation
```

**Result:** 10 workers can safely process matches from the same tournament simultaneously without race conditions.

---

## 3. Implementation Details

### Match Processing Flow

1. **Cron Schedule Triggers** (every 10 minutes by default)
2. **Orchestrator finds matches needing updates:**
   - Open matches with dates in the past
   - Not checked in the last 5 minutes
3. **Queue-based processing (if available):**
   - Jobs queued (one per match)
   - 10 workers process jobs concurrently
   - Each job fetches latest data from SofaScore
4. **Sequential fallback (if queue unavailable):**
   - Matches processed one by one
   - Same logic, slower execution
5. **Match end triggers scoreboard update:**
   - Calculate points for all guesses
   - Dual-write to PostgreSQL and Redis
   - Update tournament standings

### Error Handling Strategy

- **Scoreboard errors are swallowed:** Logged but don't break match processing
- **Match update job completes successfully** even if scoreboard fails
- **Allows system to continue processing** other matches
- **Errors logged for monitoring** via Sentry

**Rationale:** Match data is more critical than scoreboard updates. Scoreboards can be recalculated if needed, but match data must be captured when available.

### Performance Characteristics

| Scenario | Sequential Mode | Concurrent Mode | Improvement |
|----------|----------------|-----------------|-------------|
| 200 matches | ~17 minutes | ~2 minutes | **8.5x faster** |
| 50 matches | ~4 minutes | ~30 seconds | **8x faster** |
| Single match | ~5 seconds | ~5 seconds | Same |
| Cron overhead | Blocking | Non-blocking | Better |

---

## 4. API Reference

All endpoints require **Admin JWT token** authentication.

### Endpoints

#### 1. Trigger Match Polling (Manual)

**POST** `/api/v2/admin/scheduler/trigger-match-polling`

Manually trigger the match update process without waiting for the cron schedule.

**Request:**
```bash
curl -X POST http://localhost:9090/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response (Concurrent Mode):**
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

**Note:** Concurrent mode returns immediately after queueing. Workers process in background.

#### 2. Get Polling Stats

**GET** `/api/v2/admin/scheduler/stats`

Get current statistics about matches that need updates.

**Response:**
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

#### 3. Get Queue Stats

**GET** `/api/v2/admin/scheduler/queue-stats`

Get queue health and statistics including pending jobs, worker count, and retry policy.

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
  }
}
```

#### 4. Get Job Status

**GET** `/api/v2/admin/scheduler/jobs/:jobId`

Track the status of a specific job by its ID.

**Response:**
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
  }
}
```

**Job States:**
- `created`: Job queued, waiting for worker
- `active`: Job currently being processed
- `completed`: Job finished successfully
- `failed`: Job failed after all retries
- `retry`: Job failed, will be retried

### Authentication

**Getting an Admin Token:**

```javascript
// Development only - generate manually
const jwt = require('jsonwebtoken');
const token = jwt.sign({ admin: true }, process.env.ADMIN_JWT_SECRET);
console.log(token);
```

---

## 5. Deployment Guide

### Railway Platform Deployment

#### Prerequisites
- Railway project with existing API service
- Same GitHub repository connected to Railway
- Environment variables configured for API

#### Step 1: Create Scheduler Service

1. Go to Railway project dashboard
2. Click **"+ New"** → **"Service"**
3. Select **"GitHub Repo"** (same repo as API)
4. Name it: `api-best-shot-scheduler`

#### Step 2: Configure Build & Start

**Build Command:**
```bash
yarn install && yarn build-prod
```

**Start Command:**
```bash
yarn scheduler:prod
```

#### Step 3: Environment Variables

##### Required Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DB_STRING_CONNECTION` | PostgreSQL connection (for database + queue) | ✅ | `postgresql://...` |
| `REDIS_URL` | Redis connection for scoreboard | ✅ | `redis://...` |
| `MATCH_POLLING_ENABLED` | Enable cron job | ✅ | `true` |
| `MATCH_POLLING_CRON` | Cron schedule | ✅ | `*/10 * * * *` |
| `NODE_ENV` | Environment | ✅ | `production` |
| `AWS_REGION` | AWS region for S3 | ✅ | `us-east-1` |
| `AWS_BUCKET_NAME` | S3 bucket name | ✅ | `best-shot-reports` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | ✅ | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | ✅ | Secret |
| `SLACK_JOB_EXECUTIONS_WEBHOOK` | Slack notifications | ⬜ | `https://hooks.slack...` |
| `SENTRY_DSN` | Error tracking | ⬜ | `https://...@sentry.io/...` |

##### Easy Setup via Railway

Railway allows referencing variables from other services:
1. In Scheduler service → Variables tab
2. Click **"Add Variable Reference"**
3. Select your API service
4. Choose variables to share

#### Step 4: Deploy

Railway automatically deploys after configuration.

**Expected startup logs:**
```
🚀 Best Shot Scheduler Starting...
Configuration:
  Match Polling Enabled: true
  Match Polling Schedule: */10 * * * * (Every 10 minutes)

[Scheduler] Initializing queue and workers...
[Scheduler] ✅ Queue service available
[Scheduler] Queue Configuration:
  Queue Name: update-match
  Workers: 10 concurrent workers
  Processing Mode: Concurrent (background workers)

✅ Match update cron job scheduled successfully
```

### Deployment Checklist

- [ ] Create new Railway service: `api-best-shot-scheduler`
- [ ] Set build command: `yarn install && yarn build-prod`
- [ ] Set start command: `yarn scheduler:prod`
- [ ] Copy environment variables from API service
- [ ] Set `DB_STRING_CONNECTION`
- [ ] Set `REDIS_URL`
- [ ] Set `MATCH_POLLING_ENABLED=true`
- [ ] Set `MATCH_POLLING_CRON=*/10 * * * *`
- [ ] Deploy and watch logs
- [ ] Verify queue initialized (logs show "Queue service available")
- [ ] Check queue stats endpoint returns `available: true`
- [ ] Verify executions in `data_provider_executions` table
- [ ] Check Redis scoreboard keys exist
- [ ] Test kill switch (`MATCH_POLLING_ENABLED=false`)
- [ ] Monitor for 24 hours to ensure stability

### Customizing the Schedule

Edit `MATCH_POLLING_CRON` environment variable:

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 5 minutes | `*/5 * * * *` | More frequent updates |
| Every 10 minutes | `*/10 * * * *` | **Default (recommended)** |
| Every 15 minutes | `*/15 * * * *` | Less frequent |
| Every hour | `0 * * * *` | Minimal polling |

**Note:** Restart scheduler service after changing.

---

## 6. Operations & Monitoring

### Kill Switches & Control

#### Soft Kill (Temporary Pause)
**In Railway:** Scheduler service → Variables → Edit `MATCH_POLLING_ENABLED`

```bash
MATCH_POLLING_ENABLED=false  # Disables cron (service keeps running)
```

Service will log:
```
⚠️  Match polling is DISABLED
   Set MATCH_POLLING_ENABLED=true to enable
```

#### Hard Kill (Emergency Stop)
**In Railway:** Scheduler service → Settings → Stop Service
- Completely stops the scheduler
- Restart manually when ready

#### Scale to Zero
**In Railway:** Scheduler service → Settings → Scale to 0 replicas
- Pauses service without deleting it
- Scale back to 1 when ready

### Key Metrics to Monitor

#### 1. Queue Health
```bash
curl -X GET https://your-api.railway.app/api/v2/admin/scheduler/queue-stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Healthy indicators:
# - available: true
# - pendingJobs: < 10
# - workers.count: 10
```

#### 2. Execution Success Rate
```sql
-- Check job completion rate
SELECT
  state,
  count(*) as count,
  round(100.0 * count(*) / sum(count(*)) OVER (), 2) as percentage
FROM pgboss.job
WHERE name = 'update-match'
  AND createdon > NOW() - INTERVAL '24 hours'
GROUP BY state;

-- Healthy targets:
-- completed: > 95%
-- failed: < 5%
```

#### 3. Memory Usage
- **Expected:** 400-600MB total
  - Playwright: ~300-500MB per execution
  - pg-boss queue: ~50-100MB overhead
- **Alert if:** > 800MB

#### 4. Redis Scoreboard Health
```bash
redis-cli
> ZRANGE tournament:{id}:master_scores 0 -1 WITHSCORES
> INFO memory  # Should be < 100MB
> DBSIZE       # Monitor key count
```

#### 5. Processing Duration
- **Concurrent mode:** 200 matches in ~2 minutes ✅
- **Sequential mode:** 200 matches in ~17 minutes ⚠️
- If mode switches unexpectedly, indicates queue issue

### Monitoring Workflows

#### Daily Health Check
```bash
# 1. Check queue status
curl GET .../scheduler/queue-stats

# 2. Check polling stats
curl GET .../scheduler/stats

# 3. Verify recent executions
SELECT * FROM data_provider_executions
WHERE started_at > NOW() - INTERVAL '1 day'
ORDER BY started_at DESC;
```

#### After Deployment
```bash
# 1. Deploy code changes
# 2. Check stats
curl GET .../scheduler/stats -H "Authorization: Bearer TOKEN"

# 3. Manually trigger to test
curl POST .../scheduler/trigger-match-polling -H "Authorization: Bearer TOKEN"

# 4. Verify in database
# Check data_provider_executions table for new records
```

### Cost Optimization

Railway charges based on resource usage:
- **Estimated cost:** ~$5-10/month for scheduler service
- **Tips:**
  - Keep cron at 10-minute intervals
  - Monitor memory usage - scale down if possible
  - Use kill switch during off-season

---

## 7. Troubleshooting

### Queue Issues

#### Jobs not processing (pending count growing)

**Diagnosis:**
```bash
# Check queue stats
curl GET .../scheduler/queue-stats -H "Authorization: Bearer TOKEN"

# Check scheduler logs
railway logs --service scheduler --filter "Queue"
```

**Common causes:**
1. Queue workers not started
2. Database connection issues
3. pg-boss schema not created

**Fix:**
- Verify `MATCH_POLLING_ENABLED=true`
- Check `DB_STRING_CONNECTION` is correct
- Restart scheduler service

#### All jobs failing with retry

**Diagnosis:**
```bash
# Check specific job
curl GET .../scheduler/jobs/JOB_ID -H "Authorization: Bearer TOKEN"

# Check error logs
railway logs --service scheduler --filter "Failed to process match"
```

**Common causes:**
1. SofaScore API down/blocking
2. Browser initialization failures
3. Database connection errors

**Fix:**
- Check SofaScore API availability
- Verify Playwright: `npx playwright install chromium`
- Check database and Redis connections

#### Queue showing as unavailable

**Diagnosis:**
```bash
# Check queue stats
curl GET .../scheduler/queue-stats

# Check startup logs
railway logs --service scheduler --filter "Queue"
```

**Fix:**
- Verify `DB_STRING_CONNECTION` in environment
- Check PostgreSQL accessibility
- Restart scheduler to reinitialize

### Performance Issues

#### 200 matches taking > 3 minutes

**Diagnosis:**
```bash
# Check queue stats for worker count
curl GET .../scheduler/queue-stats

# Check job processing times
railway logs --filter "duration"
```

**Common causes:**
1. Workers not running concurrently
2. SofaScore API slow
3. Database connection pool exhausted

**Fix:**
- Verify workers = 10
- Check network latency
- Increase database pool if needed

### Scoreboard Issues

#### Match updated but scoreboard not reflecting

**Diagnosis:**
```bash
# Check scoreboard errors
railway logs --filter "Scoreboard update failed"

# Verify PostgreSQL points
SELECT * FROM "T_TournamentMember" WHERE tournament_id = :id;

# Verify Redis scores
ZRANGE tournament:{id}:master_scores 0 -1 WITHSCORES
```

**Fix:**
- Check logs for specific error
- Verify Redis connection (`REDIS_URL`)
- Scoreboard errors are non-fatal by design

### Common Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| `Browser not found` | Playwright not installed | Railway auto-installs, or check buildpack |
| `Queue service unavailable` | pg-boss init failed | Check DB connection, restart service |
| `401 Unauthorized` | Invalid admin JWT | Verify admin secret, regenerate token |
| `Connection pool exhausted` | Too many concurrent connections | Reduce workers or increase pool |
| `Scoreboard update failed` | Redis connection issue | Check `REDIS_URL`, non-fatal error |

### Emergency Procedures

#### Rollback to Sequential Processing

**Option 1: Environment Variable (Immediate)**
```bash
# In Railway: Add to scheduler service
DISABLE_QUEUE=true
# Service falls back to sequential mode
```

**Option 2: Code Rollback**
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous version
```

**Impact:**
- ✅ No data loss
- ✅ No breaking changes
- ⚠️ Performance degradation (back to 17 min/200 matches)
- ⚠️ No job tracking

---

## 8. Migration History & Decisions

### Evolution Timeline

```
2026-01 (Initial): Simple cron + sequential processing
  ↓ Performance issues at scale
2026-01-24: Queue-based concurrent processing added
  ↓ 8.5x performance improvement
Future: Full queue architecture (per ADR-005)
```

### Performance Evolution

| Version | Date | 200 Matches | Architecture |
|---------|------|-------------|--------------|
| v1.0 | Jan 2026 | ~17 minutes | Cron + Sequential |
| v2.0 | Jan 24, 2026 | ~2 minutes | Cron + Queue + 10 Workers |
| Future | TBD | < 1 minute | Full queue architecture |

### Technical Debt (ADR-005)

**Current state:** Queue infrastructure exists but scheduler uses hybrid approach
**Target state:** Full queue-based architecture for all async work
**Priority:** Medium - current system works but is suboptimal at scale

**Warning for future engineers:**
⚠️ Do not assume the scheduler fully uses queues. The queue infrastructure (`src/services/queue/`) exists, but the match scheduler uses a hybrid approach with direct service calls.

### Migration Benefits Achieved

- **Performance:** 8.5x faster processing
- **Reliability:** Automatic retry with exponential backoff
- **Scalability:** Can increase workers as needed
- **Resilience:** Graceful fallback to sequential
- **Observability:** Job tracking and monitoring

---

## Appendices

### A. Quick Reference

#### 🚀 Common Commands

**Admin API Endpoints:**
```bash
# Check scheduler health
curl GET https://api.railway.app/api/v2/admin/scheduler/stats \
  -H "Authorization: Bearer TOKEN"

# Trigger manual update
curl POST https://api.railway.app/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer TOKEN"

# Check queue status
curl GET https://api.railway.app/api/v2/admin/scheduler/queue-stats \
  -H "Authorization: Bearer TOKEN"

# Track specific job
curl GET https://api.railway.app/api/v2/admin/scheduler/jobs/{JOB_ID} \
  -H "Authorization: Bearer TOKEN"
```

**Database Queries:**
```sql
-- Recent executions
SELECT * FROM data_provider_executions
ORDER BY started_at DESC LIMIT 10;

-- Queue job states
SELECT state, count(*) FROM pgboss.job
WHERE name = 'update-match' GROUP BY state;

-- Check pending jobs
SELECT * FROM pgboss.job
WHERE state = 'created' AND name = 'update-match';

-- Scoreboard consistency
SELECT member_id, points FROM "T_TournamentMember"
WHERE tournament_id = :id ORDER BY points DESC;
```

**Railway Commands:**
```bash
# View logs
railway logs --service scheduler

# Restart service
railway restart --service scheduler

# Check environment variables
railway variables --service scheduler

# Stop service (emergency)
railway stop --service scheduler

# Scale to zero
railway scale --service scheduler --replicas 0
```

#### 🚨 Emergency Procedures

**Soft Kill (Pause):**
```bash
# In Railway: Scheduler service → Variables
MATCH_POLLING_ENABLED=false
# Service continues running, cron disabled
```

**Hard Kill (Stop):**
```bash
railway stop --service scheduler
# Or via Railway dashboard → Settings → Stop Service
```

**Force Sequential Mode:**
```bash
# Add environment variable
DISABLE_QUEUE=true
# Falls back to sequential processing (slower)
```

**Rollback Code:**
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous version
```

#### 📊 Health Indicators

**✅ Healthy System:**
- Queue stats: `available: true`
- Pending jobs: < 10
- Worker count: 10
- Job completion rate: > 95%
- Memory usage: < 600MB
- Processing 200 matches: ~2 minutes

**⚠️ Warning Signs:**
- Pending jobs: 10-50
- Job failure rate: 5-10%
- Memory usage: 600-800MB
- Processing taking > 3 minutes

**🔴 Critical Issues:**
- Queue unavailable
- Pending jobs: > 50
- Job failure rate: > 10%
- Memory usage: > 800MB
- Service crashing/restarting

#### 🔍 Common Issues & Fixes

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| **Jobs not processing** | Check `pgboss.job` table | Restart scheduler service |
| **Queue unavailable** | Check DB connection | Verify `DB_STRING_CONNECTION` |
| **High failure rate** | Check job errors | Check SofaScore API status |
| **Memory issues** | Railway metrics > 800MB | Reduce workers or restart |
| **Scoreboard out of sync** | Compare PostgreSQL vs Redis | Check `REDIS_URL`, errors are non-fatal |

#### ⏱️ Cron Schedules

| Frequency | Expression | Use Case |
|-----------|------------|----------|
| Every 5 min | `*/5 * * * *` | Live matches, high activity |
| Every 10 min | `*/10 * * * *` | **Default - recommended** |
| Every 15 min | `*/15 * * * *` | Lower activity periods |
| Every hour | `0 * * * *` | Off-season, minimal updates |

#### 📈 Performance Metrics

**Processing Times:**
| Matches | Sequential | Concurrent | Speedup |
|---------|------------|------------|---------|
| 1 | ~5 sec | ~5 sec | 1x |
| 50 | ~4 min | ~30 sec | 8x |
| 200 | ~17 min | ~2 min | 8.5x |

**Resource Usage:**
| Component | Memory | CPU |
|-----------|--------|-----|
| Playwright | 300-500MB | Medium |
| pg-boss queue | 50-100MB | Low |
| Workers (10) | 50MB | Medium |
| **Total Expected** | 400-600MB | Medium |

#### 🔧 Admin Token

```javascript
// Generate admin token (dev only)
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { admin: true },
  process.env.ADMIN_JWT_SECRET
);
console.log(token);
```

#### 📝 Logs to Watch

**Startup Success:**
```
✅ Queue service available
✅ Queue workers registered successfully
✅ Match update cron job scheduled successfully
```

**Normal Operation:**
```
[MatchUpdateCron] Matches needing update: 15
[MatchUpdateCron] Queued 15/15 matches for processing
[MatchUpdateOrchestrator] [Job] Successfully updated match: 12345678
```

**Warning Signs:**
```
⚠️ Queue service unavailable
⚠️ Match polling is DISABLED
Failed to process match: [error]
Scoreboard update failed: [error]
```

### B. Testing Locally

```bash
# 1. Start database
docker compose up -d

# 2. Start API with scheduler
yarn dev

# 3. Get admin token
# See authentication section

# 4. Test manual trigger
curl -X POST http://localhost:9090/api/v2/admin/scheduler/trigger-match-polling \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### C. Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_STRING_CONNECTION` | ✅ | - | PostgreSQL connection |
| `REDIS_URL` | ✅ | - | Redis for scoreboard |
| `MATCH_POLLING_ENABLED` | ✅ | `false` | Enable scheduler |
| `MATCH_POLLING_CRON` | ✅ | `*/10 * * * *` | Cron schedule |
| `NODE_ENV` | ✅ | `development` | Environment |
| `AWS_*` | ✅ | - | AWS credentials for S3 |
| `SLACK_JOB_EXECUTIONS_WEBHOOK` | ⬜ | - | Slack notifications |
| `SENTRY_DSN` | ⬜ | - | Error tracking |
| `DISABLE_QUEUE` | ⬜ | `false` | Force sequential mode |

### D. Related Documentation

- **Queue System:** See `/docs/guides/job-queues-with-pgboss.md` for pg-boss concepts
- **Scoreboard:** See `/docs/guides/scoreboard-streaming-explained.md` for memory-safe processing
- **Technical Debt:** See `/docs/decisions/005-scheduler-queue-architecture-debt.md` for future plans

---

**Document Version:** 3.0
**Created:** January 21, 2026
**Last Updated:** January 28, 2026
**Status:** Current

**Changelog:**
- **v3.0 (Jan 28, 2026):** Unified documentation from scheduler-admin-api, railway-deployment, and queue-migration guides
- **v2.0 (Jan 24, 2026):** Added queue-based processing, new endpoints, scoreboard integration
- **v1.0 (Jan 21, 2026):** Initial documentation