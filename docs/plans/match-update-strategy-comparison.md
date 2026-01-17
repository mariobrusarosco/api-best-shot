# Match Update Strategy: Polling vs Scheduled Jobs

## Two Approaches

### Approach A: Polling (Your Idea)
```
Every 10 minutes:
  → Find matches needing update
  → Update them
  → Done
```

### Approach B: Individual Scheduled Jobs (Original Diagram)
```
Daily at 00:01:
  → Create job for each match (run at match_time + 3h)
  → Jobs execute at scheduled times
```

---

## My Architectural Analysis

### Approach A (Polling) ✅ RECOMMENDED

**How it works**:
```sql
-- Every 10 minutes, run this query:
SELECT * FROM matches
WHERE status = 'open'
  AND date < NOW() - INTERVAL '2 hours'
  AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '10 minutes')
LIMIT 50;
```

Then update those matches.

#### Pros
1. ✅ **Simpler** - One cron job, one query
2. ✅ **Self-correcting** - Missed a check? Next one catches it
3. ✅ **Adaptive** - Automatically handles delays, postponements
4. ✅ **Less database writes** - No creating thousands of job records
5. ✅ **Easy to debug** - Just check the cron logs
6. ✅ **Resilient** - If cron fails once, next run recovers
7. ✅ **Resource efficient** - Only runs when there's work

#### Cons
1. ⚠️ **Less precise timing** - Updates happen within 10 min window, not exact time
2. ⚠️ **Wasted queries** - Runs even when no matches need updating

#### Cost Analysis
- **Database**: 1 query every 10 minutes = 144 queries/day
- **At your scale**: Negligible
- **Job queue**: Only 1 recurring job (not thousands)

---

### Approach B (Individual Scheduled Jobs)

**How it works**:
```typescript
// Daily at 00:01
const todayMatches = await getMatchesStartingToday();

for (const match of todayMatches) {
  await queueService.addJob('update-match', {
    matchId: match.id
  }, {
    runAt: new Date(match.date.getTime() + 3 * 60 * 60 * 1000)
  });
}
```

#### Pros
1. ✅ **Precise timing** - Runs exactly at specified time
2. ✅ **Follows your diagram** - Matches original vision
3. ✅ **Granular control** - Can customize per match

#### Cons
1. ❌ **Complex** - Daily routine + individual job management
2. ❌ **Database heavy** - Create/store thousands of job records
3. ❌ **Fragile** - What if match is postponed after job created?
4. ❌ **Hard to debug** - Which job failed? Why?
5. ❌ **Over-engineering** - 10-min precision not critical for your use case
6. ❌ **Job queue bloat** - Thousands of scheduled jobs in queue

#### Cost Analysis
- **Jobs created daily**: ~50 matches × 365 days = 18,250 jobs/year
- **Database writes**: Much higher
- **Queue storage**: More pg-boss table rows

---

## Real-World Comparison

### Companies Using Polling (Approach A)
- **GitHub Actions**: Checks repo for new commits every X minutes
- **Email providers**: Poll IMAP servers for new mail
- **Weather apps**: Poll weather API every 15 minutes

**When**: Work happens on external schedule you don't control

### Companies Using Scheduled Jobs (Approach B)
- **Calendar apps**: Send reminder at exact user-specified time
- **Subscription billing**: Charge exactly 30 days after signup
- **Meeting reminders**: Notify 10 minutes before meeting

**When**: Exact timing matters to user experience

---

## For Your Use Case

### Does Exact Timing Matter?

**Question**: Does it matter if a match is updated at:
- 19:00:00 (exactly 3h after match start)
- vs
- 19:08:23 (within 10min window)

**My Opinion**: No. Here's why:

1. **User doesn't see the difference** - 8 minutes is negligible
2. **Matches vary in length** - Some go to extra time, so 3h is arbitrary anyway
3. **Data provider lag** - SofaScore might not have data immediately
4. **Score calculation is async** - Users see "syncing" status anyway

**Therefore**: Polling is perfect for this.

---

## Hybrid Approach (If You Want Best of Both)

Use polling, but check more frequently during "match hours":

```typescript
// Smart polling frequency
function getPollingInterval() {
  const hour = new Date().getHours();

  // Match hours (12:00 - 23:00): Check every 5 min
  if (hour >= 12 && hour <= 23) {
    return 5 * 60 * 1000; // 5 minutes
  }

  // Off hours: Check every 30 min
  return 30 * 60 * 1000;
}
```

**Benefits**:
- More responsive during peak times
- Less resource usage overnight
- Still simple architecture

---

## My Recommendation

**Use Approach A (Polling)** with these specifics:

```typescript
// Match Update Cron Job
// Runs every 10 minutes

async function checkAndUpdateMatches() {
  const matches = await db.query.matches.findMany({
    where: and(
      eq(matches.status, 'open'),
      lt(matches.date, sql`NOW() - INTERVAL '2 hours'`),
      or(
        isNull(matches.lastCheckedAt),
        lt(matches.lastCheckedAt, sql`NOW() - INTERVAL '10 minutes'`)
      )
    ),
    limit: 50
  });

  if (matches.length === 0) {
    logger.info('No matches need updating');
    return;
  }

  logger.info(`Updating ${matches.length} matches`);

  // Add to queue for processing
  await queueService.addJob('update-matches-batch', {
    matchIds: matches.map(m => m.id)
  });
}
```

**Why this wins**:
1. ✅ Simple to implement
2. ✅ Easy to debug
3. ✅ Self-healing
4. ✅ Cost effective
5. ✅ Fits your scale perfectly

---

## Schema Addition Required

```sql
-- Add to matches table
ALTER TABLE match
ADD COLUMN last_checked_at TIMESTAMP;

CREATE INDEX idx_match_update_check
ON match(status, date, last_checked_at)
WHERE status = 'open';
```

This makes the polling query fast.

---

## Decision Framework

Choose **Individual Scheduled Jobs** (Approach B) if:
- Exact timing is critical (it's not)
- You need per-match customization (you don't)
- You're building Uber (you're not)

Choose **Polling** (Approach A) if:
- Simplicity matters ✅
- Budget constrained ✅
- 10-min precision is fine ✅
- You want maintainable code ✅

---

## Verdict

**Polling wins** for your use case. It's what I'd build at a startup.

Save the complex scheduled jobs for when you actually need them (you might never).

