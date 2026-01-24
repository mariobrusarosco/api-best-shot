
# Railway Scheduler Deployment Guide

This guide covers deploying the Match Update Scheduler as a separate Railway service.

## Architecture Overview

```
Railway Project: api-best-shot
├── Service 1: API (existing)
│   └── Handles HTTP requests
└── Service 2: Scheduler (NEW)
    └── Runs automated match updates every 10 minutes
```

**Why separate services?**
- Scheduler crashes don't affect API uptime
- Independent resource limits (Playwright needs more memory)
- Separate logs for easier debugging
- Independent deployments (update one without restarting the other)
- Better kill switch control

---

## Prerequisites

- ✅ Railway project with existing API service
- ✅ Same GitHub repository connected to Railway
- ✅ Environment variables already configured for API

---

## Step 1: Create Scheduler Service in Railway

### 1.1 Add New Service

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Service"**
3. Select **"GitHub Repo"** (same repo as your API)
4. Name it: `api-best-shot-scheduler` (or similar)

### 1.2 Configure Build & Start Commands

In the scheduler service settings:

**Root Directory:** `.` (same as API - it's the same repo!)

**Build Command:**
```bash
yarn install && yarn build-prod
```

**Start Command:**
```bash
yarn scheduler:prod
```

**Or if Railway auto-detects package.json:**
Just set the start command override to: `yarn scheduler:prod`

---

## Step 2: Configure Environment Variables

### 2.1 Required Variables

The scheduler service needs access to the same environment variables as the API:

**Database:**
- `DB_STRING_CONNECTION` - PostgreSQL connection string (also used by pg-boss queue)

**Redis (for Scoreboard):**
- `REDIS_URL` - Redis connection string for scoreboard cache

**Scheduler-Specific:**
- `MATCH_POLLING_ENABLED=true` - Enable the cron job
- `MATCH_POLLING_CRON=*/10 * * * *` - Schedule (every 10 minutes)

**Note:** Queue uses the same PostgreSQL database (pg-boss schema), no additional queue-specific config needed

**AWS (for S3 reports):**
- `AWS_REGION`
- `AWS_BUCKET_NAME`
- `AWS_CLOUDFRONT_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Slack (for notifications):**
- `SLACK_JOB_EXECUTIONS_WEBHOOK`

**Monitoring:**
- `SENTRY_DSN` (optional, for error tracking)
- `NODE_ENV=production`

### 2.2 Easy Setup: Share Variables

Railway lets you **reference variables from other services**:

1. In Scheduler service → Variables tab
2. Click **"Add Variable Reference"**
3. Select your API service
4. Choose variables to share (DB_STRING_CONNECTION, AWS_*, etc.)

**OR** manually copy environment variables from API service to Scheduler service.

### 2.3 Scheduler-Specific Overrides

Add these NEW variables to the scheduler service:

```bash
MATCH_POLLING_ENABLED=true
MATCH_POLLING_CRON=*/10 * * * *
NODE_ENV=production
```

---

## Step 3: Deploy

1. Railway will automatically deploy after configuration
2. Watch the deployment logs for:
   ```
   🚀 Best Shot Scheduler Starting...
   Configuration:
     Match Polling Enabled: true
     Match Polling Schedule: */10 * * * * (Every 10 minutes)
   ✅ Match update cron job scheduled successfully
   ```

3. Initial match update runs immediately on startup
4. Subsequent updates run every 10 minutes

---

## Step 4: Verify Deployment

### Check Logs

In Railway dashboard → Scheduler service → Logs:

**On startup (Queue Available):**
```
🚀 Best Shot Scheduler Starting...
Configuration:
  Match Polling Enabled: true
  Match Polling Schedule: */10 * * * * (Every 10 minutes)

[Scheduler] Initializing queue and workers...
[Scheduler] ✅ Queue service available
[Scheduler] Initializing browser...
[Scheduler] Browser initialized successfully
[MatchUpdateOrchestrator] Registering queue workers...
[MatchUpdateOrchestrator] ✅ Queue workers registered successfully

[Scheduler] Queue Configuration:
  Queue Name: update-match
  Workers: 10 concurrent workers
  Concurrency: 1 job per worker
  Retry Policy: 3 attempts with exponential backoff (30s → 60s → 120s)
  Job Expiration: 2 hours
  Processing Mode: Concurrent (background workers)

✅ Match update cron job scheduled successfully

[Scheduler] Running initial match update...
```

**Every 10 minutes (Concurrent Mode):**
```
=== [MatchUpdateCron] Starting scheduled execution ===
[MatchUpdateCron] Time: 2026-01-24T15:30:00.000Z
[MatchUpdateCron] Matches needing update: 15
[MatchUpdateOrchestrator] Starting queue-based match update process...
[MatchUpdateOrchestrator] Found 15 matches needing updates
[MatchUpdateOrchestrator] Queued 15/15 matches for processing

[MatchUpdateCron] Results:
  ✅ Processed: 15
  📋 Queued: 15
  ⚡ Processing: Concurrent (workers will process jobs in background)
=== [MatchUpdateCron] Completed ===

[Background workers processing jobs...]
[MatchUpdateOrchestrator] [Job] Processing match: 12345678
[MatchUpdateOrchestrator] [Job] Successfully updated match: 12345678
[MatchUpdateOrchestrator] [Job] Match ended, updating scoreboard for match: match-789
[MatchUpdateOrchestrator] [Job] Scoreboard updated successfully for match: match-789
```

**On startup (Queue Unavailable - Fallback):**
```
[Scheduler] Initializing queue and workers...
[Scheduler] ⚠️  Queue service unavailable
[Scheduler] Mode: Sequential processing (fallback)
```

### Check Database

Query the `data_provider_executions` table:

```sql
SELECT
  request_id,
  operation_type,
  status,
  started_at,
  completed_at,
  duration
FROM data_provider_executions
WHERE operation_type IN ('MATCHES_UPDATE', 'STANDINGS_UPDATE')
ORDER BY started_at DESC
LIMIT 10;
```

You should see executions every 10 minutes!

### Check Slack

If `SLACK_JOB_EXECUTIONS_WEBHOOK` is configured, you'll get notifications for each execution.

### Check Queue Status (via Admin API)

Use the admin API endpoints to monitor queue health:

```bash
# Check queue stats
curl -X GET https://your-api.railway.app/api/v2/admin/scheduler/queue-stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected response (healthy queue):
{
  "success": true,
  "data": {
    "available": true,
    "mode": "concurrent",
    "queue": {
      "name": "update-match",
      "pendingJobs": 2
    },
    "workers": {
      "count": 10,
      "concurrency": 1
    }
  }
}
```

### Check Redis Scoreboard

Monitor scoreboard updates in Redis:

```bash
# Connect to Railway Redis
railway connect Redis

# Check tournament scores
redis-cli
> ZRANGE tournament:{tournamentId}:master_scores 0 -1 WITHSCORES

# Check memory usage
> INFO memory

# Check key count
> DBSIZE
```

**Healthy indicators:**
- Tournament score keys exist for active tournaments
- Memory usage is stable (< 100MB typically)
- Scores match PostgreSQL `T_TournamentMember.points`

---

## Kill Switches & Control

### Soft Kill (Recommended for Temporary Pause)

**In Railway:** Scheduler service → Variables → Edit `MATCH_POLLING_ENABLED`

```bash
MATCH_POLLING_ENABLED=false  # Disables cron jobs (service keeps running)
```

Service will log:
```
⚠️  Match polling is DISABLED
   Set MATCH_POLLING_ENABLED=true to enable
```

Re-enable by setting it back to `true`.

### Hard Kill (Emergency Stop)

**In Railway:** Scheduler service → Settings → Stop Service

- Completely stops the scheduler
- Restart manually when ready

### Scale to Zero

**In Railway:** Scheduler service → Settings → Scale to 0 replicas

- Pauses service without deleting it
- Scale back to 1 when ready

---

## Customizing the Schedule

Edit `MATCH_POLLING_CRON` in Railway environment variables:

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 5 minutes | `*/5 * * * *` | More frequent updates |
| Every 10 minutes | `*/10 * * * *` | **Default (recommended)** |
| Every 15 minutes | `*/15 * * * *` | Less frequent |
| Every hour | `0 * * * *` | Minimal polling |

**After changing:** Restart the scheduler service for changes to take effect.

---

## Troubleshooting

### Scheduler service keeps crashing

**Check:**
1. Database connection string is correct
2. Playwright browser can launch (Railway has Chromium support)
3. Memory limits are sufficient (Playwright needs ~512MB minimum)

**Fix:** In Railway → Scheduler service → Settings → Increase memory limit

### No matches being updated

**Check:**
1. `MATCH_POLLING_ENABLED=true` is set
2. Database has matches with `status='open'` and past dates
3. Logs show cron job is running

**Debug:** Check execution table for error messages

### "Browser not found" errors

**Fix:** Railway automatically installs Chromium, but you may need to add buildpack.

In `railway.toml` (if needed):
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "yarn scheduler:prod"
```

Railway's Nixpacks should auto-detect Playwright and install dependencies.

---

## Monitoring

### Key Metrics to Watch

1. **Queue Health**
   - Use admin API: `GET /api/v2/admin/scheduler/queue-stats`
   - Check pending jobs count (should be low, < 10)
   - Verify workers = 10 and mode = concurrent

2. **Execution Success Rate**
   - Query `data_provider_executions` table
   - Look for `status='failed'` entries

3. **Memory Usage**
   - Railway dashboard → Scheduler service → Metrics
   - Playwright: ~300-500MB per execution
   - pg-boss queue: ~50-100MB overhead
   - Total expected: 400-600MB

4. **Execution Duration** (with Queue)
   - **Concurrent mode:** 200 matches in ~2 minutes
   - **Sequential mode:** 200 matches in ~17 minutes
   - Check if mode switched unexpectedly (indicates queue issue)

5. **Redis Scoreboard Health**
   - Memory usage should be stable (< 100MB)
   - Tournament score keys should exist
   - Scores should match PostgreSQL

6. **pg-boss Queue Tables**
   ```sql
   -- Check queue health
   SELECT state, count(*)
   FROM pgboss.job
   WHERE name = 'update-match'
   GROUP BY state;

   -- Should see mostly 'completed', few 'active', minimal 'failed'
   ```

### Alerts

Set up Railway monitoring alerts for:
- Service crashes (automatic email)
- High memory usage (>80%)
- Failed deployments
- **Queue pending jobs > 50** (indicates workers not processing)
- **Redis memory > 200MB** (indicates potential memory leak)

---

## Cost Optimization

Railway charges based on:
- Memory usage
- CPU usage
- Execution time

**Tips:**
1. Keep `MATCH_POLLING_CRON` at 10-minute intervals (don't over-poll)
2. Monitor memory usage - scale down if possible
3. Use kill switch during off-season to save costs

**Estimated cost:** ~$5-10/month for scheduler service (depends on usage)

---

## Deployment Checklist

- [ ] Create new Railway service: `api-best-shot-scheduler`
- [ ] Set build command: `yarn install && yarn build-prod`
- [ ] Set start command: `yarn scheduler:prod`
- [ ] Copy environment variables from API service
- [ ] Set `DB_STRING_CONNECTION` (for queue + database)
- [ ] Set `REDIS_URL` (for scoreboard cache)
- [ ] Set `MATCH_POLLING_ENABLED=true`
- [ ] Set `MATCH_POLLING_CRON=*/10 * * * *`
- [ ] Deploy and watch logs
- [ ] **Verify queue initialized:** Logs show "Queue workers initialized successfully"
- [ ] **Verify queue mode:** Logs show "Processing Mode: Concurrent"
- [ ] **Check queue stats:** `GET /api/v2/admin/scheduler/queue-stats` returns `available: true`
- [ ] **Verify executions in database:** `data_provider_executions` table has new entries
- [ ] **Verify pg-boss schema:** `pgboss.job` table exists
- [ ] **Check Redis scoreboard:** Tournament score keys exist
- [ ] Test kill switch (`MATCH_POLLING_ENABLED=false`)
- [ ] Monitor for 24 hours to ensure stability
- [ ] **Verify 200-match performance:** Should complete in ~2 minutes (concurrent mode)

---

## Next Steps After Deployment

Once the scheduler is running smoothly:

1. **Phase 3: Testing & Deployment** (see roadmap)
   - Monitor execution metrics
   - Set up alerts
   - Load test with multiple matches

2. **Optional Future Enhancements:**
   - Automated score calculation
   - Real-time WebSocket updates
   - Advanced retry strategies

---

## Support

**Logs:** Railway dashboard → Scheduler service → Logs
**Database:** Use Drizzle Studio locally or Railway's DB viewer
**Errors:** Check Sentry (if configured) for detailed stack traces

---

**Document Version:** 2.0
**Created:** January 21, 2026
**Last Updated:** January 24, 2026

**Changelog:**
- **v2.0 (Jan 24, 2026):** Added queue-based processing, Redis scoreboard monitoring, updated log examples, enhanced deployment checklist
- **v1.0 (Jan 21, 2026):** Initial Railway deployment guide
