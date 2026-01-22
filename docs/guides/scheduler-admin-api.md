# Scheduler Admin API

Manual triggers and monitoring for the automated match update system.

## Endpoints

### 1. Trigger Match Polling (Manual)

**POST** `/api/v2/admin/scheduler/trigger-match-polling`

Manually trigger the match update process without waiting for the cron schedule.

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

**Response (Success):**
```json
{
  "success": true,
  "message": "Match polling completed successfully",
  "data": {
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
    "duration": "45.32s",
    "timestamp": "2026-01-21T15:30:00.000Z"
  }
}
```

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

## Authentication

Both endpoints require an **Admin JWT token**.

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

**Document Version:** 1.0
**Created:** January 21, 2026
**Last Updated:** January 21, 2026
