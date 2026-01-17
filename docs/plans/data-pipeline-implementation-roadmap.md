# Data Pipeline Implementation Roadmap

## Overview

This roadmap breaks down the implementation into 3 focused phases to automate match updates.

**Scope**: Automate match data updates. Score calculation remains manual (as it is today).

---

## Phase 1: Foundation & Infrastructure

### Goal
Set up the core infrastructure needed for the polling system.

### Tasks

#### 1.1 Database Migrations
- [ ] Create migration: Add `last_checked_at` column to `match` table
- [ ] Add database index for efficient polling queries:
  ```sql
  CREATE INDEX idx_match_polling
  ON match(status, date, last_checked_at)
  WHERE status = 'open';
  ```
- [ ] Test migrations locally
- [ ] Document rollback procedures

#### 1.2 Install pg-boss (Optional - Can Add Later)
- [ ] Add pg-boss to package.json
- [ ] Configure pg-boss connection (use existing PostgreSQL)
- [ ] Verify pg-boss creates its required tables
- [ ] Test basic job creation and processing

**Note**: pg-boss might not be needed for simple cron jobs. Evaluate during Phase 2 if it's actually required.

#### 1.3 Queue Abstraction Layer (Optional - Only if Using pg-boss)
- [ ] Create `src/services/queues/queue.interface.ts` (interface)
- [ ] Create `src/services/queues/pg-boss-adapter.ts` (implementation)
- [ ] Create `src/services/queues/index.ts` (export)
- [ ] Write unit tests for adapter
- [ ] Document the abstraction pattern

**Note**: If using simple Railway cron jobs, this abstraction might be overkill for now.

### Deliverable
✅ Database ready for polling (migrations complete)
✅ Optional: Job queue infrastructure if needed

### Dependencies
None - this is the starting point

---

## Phase 2: Match Update Polling System

### Goal
Automated match data updates via polling cron job.

### Tasks

#### 2.1 Match Polling Service
- [ ] Create `src/domains/scheduler/` domain
- [ ] Create `src/domains/scheduler/services/match-polling.service.ts`
- [ ] Implement polling query:
  ```sql
  SELECT * FROM match
  WHERE status = 'open'
    AND date < NOW() - INTERVAL '2 hours'
    AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '10 minutes')
  ORDER BY date ASC
  LIMIT 50;
  ```
- [ ] Add logic to update `last_checked_at` after scraping

#### 2.2 Retry Logic with Backoff
- [ ] Create `src/utils/retry-with-backoff.ts` helper
- [ ] Add retry wrapper around scraping calls (3 attempts: 30s, 60s, 120s)
- [ ] Integrate Sentry logging for failed retries
- [ ] Test retry logic with mocked failures

#### 2.3 Integration with Existing Services
- [ ] Determine granularity: use `updateRound()` or `update()` method
- [ ] Connect polling service to `MatchesDataProviderService`
- [ ] Ensure execution jobs are created correctly
- [ ] Verify S3 reports still upload
- [ ] Test Slack notifications still work

#### 2.4 Cron Job Setup (Railway)
- [ ] Create `src/scheduler/cron-jobs.ts` entry point
- [ ] Set up match polling cron (every 10 minutes)
- [ ] Add environment variable: `MATCH_POLLING_ENABLED=true`
- [ ] Configure Railway Procfile for scheduler process
- [ ] Test cron execution locally with `node-cron`

### Deliverable
✅ **Matches automatically update every 10 minutes** (THE BIG WIN!)
✅ Failed scrapes retry with backoff
✅ Execution tracking works as before
✅ Cron job running on Railway
✅ No more manual match updates needed!

### Dependencies
- Phase 1 must be complete

---

## Phase 3: Testing & Deployment

### Goal
Ensure system reliability before production rollout.

### Tasks

#### 4.1 Manual Trigger for Testing
- [ ] Create POST `/api/v2/admin/scheduler/trigger-match-polling` (for testing/debugging)
- [ ] Add admin middleware protection
- [ ] Test manual trigger works correctly

#### 3.2 Testing
- [ ] Unit tests for polling queries
- [ ] Integration test: Full match update flow
- [ ] Test retry logic with mocked failures
- [ ] Load test with 50+ matches

#### 3.3 Monitoring & Observability
- [ ] Add logging for cron job executions
- [ ] Add metrics: matches processed, failures
- [ ] Set up Sentry alerts for repeated failures
- [ ] Document how to check if crons are running

#### 3.4 Deployment Strategy
- [ ] Deploy Phase 1 (migrations) to staging
- [ ] Deploy Phase 2 (match polling) to staging → monitor for 3 days
- [ ] Full staging smoke test
- [ ] Deploy to production (same phased approach)
- [ ] Monitor production for 1 week
- [ ] Document rollback procedures

### Deliverable
✅ Tested and validated match update automation
✅ Production deployment complete
✅ Monitoring in place
✅ **Match updates fully automated!**

### Dependencies
- Phase 1 and Phase 2 complete

---

## Post-Launch: Documentation & Cleanup

### Goal
Document the system and clean up old code. Do this after production is stable.

### Tasks

#### Documentation
- [ ] Update README with new architecture
- [ ] Document cron job configuration
- [ ] Document how to debug failed jobs
- [ ] Create runbook for common issues

#### Code Cleanup
- [ ] Remove old Lambda-related code references (if any remain)
- [ ] Drop "Scheduled Jobs" admin page (if it exists)
- [ ] Update admin UI to reflect new architecture

### Deliverable
✅ Complete documentation
✅ Clean codebase

### Dependencies
- Phase 3 complete and stable in production for 1+ week

---

## Future Work (NOT IN THIS EFFORT)

### Automated Score Calculation
When/if you want to automate score calculation later:
1. Add `participants_scores_status` field to `league_tournament`
2. Mark leagues as "outdata" when matches finish
3. Create score calculation cron job (every 5 minutes)
4. Build league score calculator service

**This is intentionally scoped OUT.**
Match automation is the win. Everything else is optional future work.

### Tasks

#### 6.1 Performance Optimization
- [ ] Review database query performance (add indexes if needed)
- [ ] Optimize score calculation queries (batch operations)
- [ ] Consider reducing polling frequency if system is stable (10min → 5min for matches)
- [ ] Review memory usage of cron jobs

#### 6.2 Code Cleanup
- [ ] Remove old Lambda-related code references (if any remain)
- [ ] Drop "Scheduled Jobs" admin page (if it exists)
- [ ] Clean up unused execution job types
- [ ] Update admin UI to reflect new architecture

#### 6.3 Future Enhancements
- [ ] Consider adding Bull Board UI for queue monitoring
- [ ] Consider WebSocket support for real-time status (if budget allows)
- [ ] Prepare migration guide for Redis (when needed)

### Deliverable
✅ Optimized system
✅ Clean codebase
✅ Ready for scale

### Dependencies
- Phase 5 complete and stable in production

---

## Rollout Strategy

### Staging Environment
1. Deploy Phase 1 → verify migrations
2. Deploy Phase 2 → test match polling for 3 days
3. Full integration smoke test
4. Monitor for 1 week

### Production Environment
1. Deploy Phase 1 (migrations only) → verify no issues
2. Deploy Phase 2 with `MATCH_POLLING_ENABLED=false` (deployed but inactive)
3. Enable match polling: `MATCH_POLLING_ENABLED=true` → monitor for 3 days
4. Monitor for 1 week total
5. Done! Match updates are automated

### Rollback Plan
- **Phase 1**: Rollback migration (drop `last_checked_at` column)
- **Phase 2**: Set `MATCH_POLLING_ENABLED=false`, rollback deployment
- **If catastrophic**: Revert to manual admin API operations (always available as fallback)

---

## Success Metrics

### Success Criteria

**Phase 2 - The Big Win:**
- ✅ 95%+ of matches update successfully automatically
- ✅ Failed scrapes recover via retry or next poll
- ✅ Execution jobs tracked correctly
- ✅ No performance degradation
- ✅ **No more manual match updates needed!**

**Overall:**
- ✅ Match updates fully automated (zero manual intervention)
- ✅ System runs within $10/month budget
- ✅ Admin can debug issues via logs and execution jobs
- ✅ Score calculation remains manual (as it is today)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Cron job crashes** | Railway auto-restart, health checks, manual trigger available |
| **Database migration fails** | Test on staging first, have rollback script ready |
| **Scraping breaks (SofaScore changes)** | Sentry alerts, fallback to manual admin API (still works!) |
| **Budget overrun** | Monitor Railway usage, simple cron jobs are lightweight |
| **Match polling overloads DB** | LIMIT 50 in query, index on polling columns |

---

## Next Steps

1. Review this roadmap with the team
2. Confirm phasing approach
3. Start Phase 1: Database migrations
4. Track progress using this document

---

**Document Version**: 1.0
**Created**: January 17, 2026
**Status**: Ready for Implementation
