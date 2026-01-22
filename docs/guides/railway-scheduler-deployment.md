
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
- `DB_STRING_CONNECTION` - PostgreSQL connection string

**Scheduler-Specific:**
- `MATCH_POLLING_ENABLED=true` - Enable the cron job
- `MATCH_POLLING_CRON=*/10 * * * *` - Schedule (every 10 minutes)

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

**On startup, you should see:**
```
[Scheduler] Initializing browser...
[Scheduler] Browser initialized successfully
[Scheduler] Scheduling match update cron job...
✅ Match update cron job scheduled successfully
[Scheduler] Running initial match update...
[MatchUpdateOrchestrator] Starting match update process...
```

**Every 10 minutes:**
```
=== [MatchUpdateCron] Starting scheduled execution ===
[MatchUpdateCron] Time: 2026-01-21T15:30:00.000Z
[MatchUpdateCron] Matches needing update: 4
[MatchUpdateOrchestrator] Found 4 matches needing updates
...
[MatchUpdateCron] Results:
  ✅ Processed: 4
  ✅ Successful: 4
  ❌ Failed: 0
  📊 Standings Updated: 2
=== [MatchUpdateCron] Completed ===
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

1. **Execution Success Rate**
   - Query `data_provider_executions` table
   - Look for `status='failed'` entries

2. **Memory Usage**
   - Railway dashboard → Scheduler service → Metrics
   - Playwright typically uses 300-500MB per execution

3. **Execution Duration**
   - Check `duration` field in executions table
   - Should be < 2 minutes for typical updates

### Alerts

Set up Railway monitoring alerts for:
- Service crashes (automatic email)
- High memory usage (>80%)
- Failed deployments

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
- [ ] Set `MATCH_POLLING_ENABLED=true`
- [ ] Set `MATCH_POLLING_CRON=*/10 * * * *`
- [ ] Deploy and watch logs
- [ ] Verify executions in database
- [ ] Test kill switch (`MATCH_POLLING_ENABLED=false`)
- [ ] Monitor for 24 hours to ensure stability

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

**Document Version:** 1.0
**Created:** January 21, 2026
**Last Updated:** January 21, 2026
