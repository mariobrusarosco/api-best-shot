# Scheduler Quick Reference

## 🚀 Common Commands

### Admin API Endpoints
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

### Database Queries
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

### Railway Commands
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

---

## ⚙️ Environment Variables

| Variable | Required | Default | Purpose |
|----------|:--------:|---------|---------|
| `DB_STRING_CONNECTION` | ✅ | - | PostgreSQL (database + queue) |
| `REDIS_URL` | ✅ | - | Redis scoreboard cache |
| `MATCH_POLLING_ENABLED` | ✅ | `false` | Enable/disable scheduler |
| `MATCH_POLLING_CRON` | ✅ | `*/10 * * * *` | Schedule frequency |
| `NODE_ENV` | ✅ | `development` | Environment mode |
| `DISABLE_QUEUE` | ⬜ | `false` | Force sequential mode |

---

## 🚨 Emergency Procedures

### Soft Kill (Pause)
```bash
# In Railway: Scheduler service → Variables
MATCH_POLLING_ENABLED=false
# Service continues running, cron disabled
```

### Hard Kill (Stop)
```bash
railway stop --service scheduler
# Or via Railway dashboard → Settings → Stop Service
```

### Force Sequential Mode
```bash
# Add environment variable
DISABLE_QUEUE=true
# Falls back to sequential processing (slower)
```

### Rollback Code
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous version
```

---

## 📊 Health Indicators

### ✅ Healthy System
- Queue stats: `available: true`
- Pending jobs: < 10
- Worker count: 10
- Job completion rate: > 95%
- Memory usage: < 600MB
- Processing 200 matches: ~2 minutes

### ⚠️ Warning Signs
- Pending jobs: 10-50
- Job failure rate: 5-10%
- Memory usage: 600-800MB
- Processing taking > 3 minutes

### 🔴 Critical Issues
- Queue unavailable
- Pending jobs: > 50
- Job failure rate: > 10%
- Memory usage: > 800MB
- Service crashing/restarting

---

## 🔍 Common Issues & Fixes

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| **Jobs not processing** | Check `pgboss.job` table | Restart scheduler service |
| **Queue unavailable** | Check DB connection | Verify `DB_STRING_CONNECTION` |
| **High failure rate** | Check job errors | Check SofaScore API status |
| **Memory issues** | Railway metrics > 800MB | Reduce workers or restart |
| **Scoreboard out of sync** | Compare PostgreSQL vs Redis | Check `REDIS_URL`, errors are non-fatal |

---

## ⏱️ Cron Schedules

| Frequency | Expression | Use Case |
|-----------|------------|----------|
| Every 5 min | `*/5 * * * *` | Live matches, high activity |
| Every 10 min | `*/10 * * * *` | **Default - recommended** |
| Every 15 min | `*/15 * * * *` | Lower activity periods |
| Every hour | `0 * * * *` | Off-season, minimal updates |

---

## 📈 Performance Metrics

### Processing Times
| Matches | Sequential | Concurrent | Speedup |
|---------|------------|------------|---------|
| 1 | ~5 sec | ~5 sec | 1x |
| 50 | ~4 min | ~30 sec | 8x |
| 200 | ~17 min | ~2 min | 8.5x |

### Resource Usage
| Component | Memory | CPU |
|-----------|--------|-----|
| Playwright | 300-500MB | Medium |
| pg-boss queue | 50-100MB | Low |
| Workers (10) | 50MB | Medium |
| **Total Expected** | 400-600MB | Medium |

---

## 🔧 Admin Token

```javascript
// Generate admin token (dev only)
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { admin: true },
  process.env.ADMIN_JWT_SECRET
);
console.log(token);
```

---

## 📝 Logs to Watch

### Startup Success
```
✅ Queue service available
✅ Queue workers registered successfully
✅ Match update cron job scheduled successfully
```

### Normal Operation
```
[MatchUpdateCron] Matches needing update: 15
[MatchUpdateCron] Queued 15/15 matches for processing
[MatchUpdateOrchestrator] [Job] Successfully updated match: 12345678
```

### Warning Signs
```
⚠️ Queue service unavailable
⚠️ Match polling is DISABLED
Failed to process match: [error]
Scoreboard update failed: [error]
```

---

## 📚 Full Documentation

For complete details, see: `/docs/guides/scheduler-complete-guide.md`

---

**Last Updated:** January 28, 2026
**Quick Reference Version:** 1.0