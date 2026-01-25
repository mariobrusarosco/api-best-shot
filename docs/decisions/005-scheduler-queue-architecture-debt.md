# ADR 005: Scheduler Queue Architecture - Technical Debt

**Date**: January 2026  
**Status**: Documented (Refactor Pending)  
**Author**: Mario Brusarosco  

---

## Context

The system has a **queue infrastructure** (`pg-boss` with abstraction layer) that was built to handle async job processing. However, there is an **architectural inconsistency**:

| Component | Uses Queue? | Should Use Queue? |
|-----------|-------------|-------------------|
| Match Update Scheduler | ❌ No (cron + direct calls) | ✅ Yes |
| League Leaderboard Updates | ✅ Yes (planned) | ✅ Yes |

---

## Current State

### Match Update Scheduler (`src/scheduler/cron-jobs.ts`)

```typescript
// Current: Sequential loop, no queue
cron.schedule('*/10 * * * *', async () => {
  const orchestrator = new MatchUpdateOrchestratorService(scraper);
  await orchestrator.processMatchUpdates(); // Loops through matches sequentially
});
```

**Problems with this approach:**
- If match #50 fails, matches 51-100 wait until next cron cycle
- If process crashes, no record of which matches were processed
- Cannot scale horizontally (single worker)
- Long execution time for many matches (sequential)

### Queue Infrastructure (exists but unused)

```
src/services/queue/
├── queue.interface.ts   # IQueue abstraction
├── pg-boss-adapter.ts   # pg-boss implementation  
├── index.ts             # getQueue() singleton
└── job-types.ts         # Job type constants
```

This infrastructure was built correctly but the match scheduler was implemented with a simpler cron + direct call approach.

---

## How This Happened

1. **Phase 1**: Queue infrastructure was built as a foundation (marked "optional")
2. **Phase 2**: During match scheduler implementation, the simpler cron approach was chosen
3. **Evaluation**: "pg-boss might not be needed for simple cron jobs" - this was correct for small scale
4. **Result**: Queue infrastructure exists but match scheduler doesn't use it

The original developer's instinct was to use queues. An AI assistant suggested the simpler approach would suffice. At scale (50-100+ matches), the queue approach would be more robust.

---

## Recommended Refactor

### Target Architecture

```typescript
// Cron just polls and queues jobs
cron.schedule('*/10 * * * *', async () => {
  const matches = await findMatchesNeedingUpdate();
  for (const match of matches) {
    await queue.send(JOB_UPDATE_MATCH, { matchId: match.id });
  }
});

// Worker processes jobs (can scale horizontally)
await queue.work(JOB_UPDATE_MATCH, async (jobs) => {
  for (const job of jobs) {
    await updateSingleMatch(job.data.matchId);
  }
});
```

### Benefits After Refactor

- ✅ Failure isolation (one match failing doesn't block others)
- ✅ Job persistence (crash recovery)
- ✅ Horizontal scaling (multiple workers)
- ✅ Better observability (job status tracking)
- ✅ Architectural consistency (all async work uses queues)

---

## Priority

**Medium** - The current system works but is fragile at scale.

### When to Refactor

- Before scaling beyond ~50 concurrent matches needing updates
- When adding more scheduled jobs
- During next major scheduler work

---

## Files Affected by Refactor

1. `src/scheduler/cron-jobs.ts` - Change to queue jobs instead of direct calls
2. `src/services/queue/job-types.ts` - Add `JOB_UPDATE_MATCH` constant
3. `src/domains/scheduler/workers/` - New worker for match updates (create)
4. `src/domains/scheduler/services/match-update-orchestrator.service.ts` - Refactor to be called by worker

---

## Warning for Future Engineers

⚠️ **Do not assume the scheduler uses queues just because queue infrastructure exists.**

The queue infrastructure (`src/services/queue/`) is real and functional, but the match update scheduler (`src/scheduler/cron-jobs.ts`) bypasses it entirely with direct service calls.

If you're adding new scheduled jobs, **use the queue pattern** (like League Leaderboard does) - don't follow the match update scheduler pattern.

---

## Related Documents

- `docs/plans/data-pipeline-implementation-roadmap.md` - Original implementation plan
- `docs/plans/queue-migration-strategy.md` - Queue abstraction rationale
- `docs/guides/job-queues-with-pgboss.md` - How to use the queue system

