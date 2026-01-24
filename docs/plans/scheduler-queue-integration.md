# Scheduler Queue Integration - Implementation Plan

**Goal**: Complete the pg-boss queue integration for the match scheduler to efficiently process 200+ matches with concurrent workers.

**Strategy**: Leverage existing queue infrastructure (pg-boss adapter, interfaces) by adding minimal, smart integration code directly into existing services rather than creating multiple new files.

**Performance Target**: Process 200 matches in ~2 minutes (vs current 17 minutes sequential)

---

## Phase 1: Core Queue Integration

### Goal
Integrate pg-boss queue into the scheduler by adding worker registration and job queueing methods to existing orchestrator service.

### Tasks

#### Task 1.1 - Add Worker Registration Method to Orchestrator []
**File**: `src/domains/scheduler/services/match-update-orchestrator.service.ts`

**Changes**:
- Add `registerWorkers()` method that registers pg-boss workers for match update jobs
- Workers will use existing `updateSingleMatchWithRetry()` method (reuse, don't duplicate)
- Configure concurrency: 10 workers processing 1 job each (10 concurrent matches)
- Set up retry logic: 3 attempts with exponential backoff (30s, 60s, 120s)

**Estimated Lines**: +45 lines

**Key Design Decision**:
- ✅ No separate job handler classes needed
- ✅ Orchestrator already has all processing logic
- ✅ Just wrap existing methods in queue worker handlers

#### Task 1.2 - Refactor processMatchUpdates() to Queue Jobs []
**File**: `src/domains/scheduler/services/match-update-orchestrator.service.ts`

**Changes**:
- Rename current `processMatchUpdates()` to `processMatchUpdatesDirect()` (keep as fallback)
- Create new `processMatchUpdates()` that queues jobs instead of processing directly
- Each match becomes a separate queue job with retry configuration
- Return queued count instead of processed results

**Estimated Lines**: +30 lines, ~10 lines modified

**Backward Compatibility**: Keep direct processing method as fallback if queue unavailable

#### Task 1.3 - Add TypeScript Types for Job Data []
**File**: `src/domains/scheduler/services/match-update-orchestrator.service.ts`

**Changes**:
- Add `MatchUpdateJobData` type definition
- Add `StandingsUpdateJobData` type definition
- Use for type-safe job queueing and processing

**Estimated Lines**: +15 lines

### Dependencies
- Existing pg-boss adapter (`src/services/queue/pg-boss-adapter.ts`)
- Existing queue interface (`src/services/queue/queue.interface.ts`)
- Existing queue service (`src/services/queue/index.ts`)

### Expected Result
- `match-update-orchestrator.service.ts` can register workers and queue jobs
- All processing logic reused, no duplication
- Type-safe job handling
- Total new code: ~90 lines in ONE file

### Next Steps
- Phase 2: Cron job integration

---

## Phase 2: Cron Job Integration

### Goal
Update cron jobs to initialize queue workers on startup and use job queueing instead of direct processing.

### Tasks

#### Task 2.1 - Initialize Queue and Workers on Startup []
**File**: `src/scheduler/cron-jobs.ts`

**Changes**:
- Import `getQueue` from queue service
- Add worker initialization in `startCronJobs()` function
- Call `orchestrator.registerWorkers()` if queue available
- Add error handling for queue initialization failures
- Graceful degradation: fall back to direct processing if queue unavailable

**Estimated Lines**: +20 lines modified

#### Task 2.2 - Update Graceful Shutdown []
**File**: `src/scheduler/cron-jobs.ts`

**Changes**:
- Import `stopQueue` from queue service
- Call `stopQueue()` in shutdown handler
- Ensure workers finish current jobs before shutdown (pg-boss handles this)

**Estimated Lines**: +5 lines

#### Task 2.3 - Add Queue Status Logging []
**File**: `src/scheduler/cron-jobs.ts`

**Changes**:
- Log queue initialization status on startup
- Log worker registration confirmation
- Add configuration display (worker count, retry settings)

**Estimated Lines**: +10 lines

### Dependencies
- Phase 1 completion
- Queue service initialization on app startup

### Expected Result
- Cron job starts workers automatically
- Workers process queued jobs in background
- Graceful shutdown stops queue cleanly
- Total modifications: ~35 lines in ONE file

### Next Steps
- Phase 3: Admin API enhancements

---

## Phase 3: Admin API Enhancements

### Goal
Add admin endpoints to monitor queue status and manually trigger match updates via queue.

### Tasks

#### Task 3.1 - Add Queue Stats Endpoint []
**File**: `src/domains/admin/api/scheduler.ts`

**Changes**:
- Add `GET /api/v2/admin/scheduler/queue-stats` endpoint
- Return queue health, pending jobs, active workers, completed/failed counts
- Use `queue.getJobById()` and queue metrics

**Estimated Lines**: +25 lines

#### Task 3.2 - Enhance Manual Trigger to Use Queue []
**File**: `src/domains/admin/api/scheduler.ts`

**Changes**:
- Modify `POST /api/v2/admin/scheduler/trigger-match-polling` to queue jobs
- Return job IDs for tracking
- Add endpoint to check specific job status by ID

**Estimated Lines**: +20 lines modified

#### Task 3.3 - Add Job Status Tracking Endpoint []
**File**: `src/domains/admin/api/scheduler.ts`

**Changes**:
- Add `GET /api/v2/admin/scheduler/jobs/:jobId` endpoint
- Return job state (created, active, completed, failed)
- Include retry information and error messages if failed

**Estimated Lines**: +20 lines

### Dependencies
- Phase 1 and 2 completion
- Admin authentication middleware (already exists)

### Expected Result
- Admins can monitor queue health
- Admins can manually trigger updates via queue
- Admins can track individual job status
- Total new code: ~65 lines in ONE file

### Next Steps
- Phase 4: Testing and validation

---

## Phase 4: Testing and Validation

### Goal
Verify queue integration works correctly with comprehensive testing.

### Tasks

#### Task 4.1 - Unit Test Worker Registration []
**File**: `src/domains/scheduler/services/match-update-orchestrator.service.test.ts` (new)

**Changes**:
- Test `registerWorkers()` creates queue and registers handler
- Mock queue interface
- Verify worker configuration (teamSize, retryLimit, etc.)

**Estimated Lines**: +40 lines

#### Task 4.2 - Integration Test Job Processing []
**File**: `test/integration/scheduler-queue.test.ts` (new)

**Changes**:
- Test end-to-end: queue job → worker processes → match updated
- Use test database
- Verify concurrent processing with multiple jobs
- Test retry logic on failures

**Estimated Lines**: +80 lines

#### Task 4.3 - Load Test with 200 Matches []
**File**: `test/load/scheduler-200-matches.test.ts` (new)

**Changes**:
- Create 200 test matches in database
- Queue all matches
- Measure processing time (target: < 3 minutes)
- Verify all matches processed successfully
- Check standings updated for affected tournaments

**Estimated Lines**: +60 lines

#### Task 4.4 - Manual Testing Checklist []
**Manual steps**:
- ✅ Start scheduler with queue enabled
- ✅ Verify workers register on startup
- ✅ Trigger cron job manually
- ✅ Check logs for job queueing
- ✅ Verify concurrent processing in logs
- ✅ Test graceful shutdown (workers finish jobs)
- ✅ Test admin endpoints (stats, manual trigger, job status)
- ✅ Test failure scenarios (SofaScore down, invalid data)
- ✅ Verify retry logic activates

### Dependencies
- Phases 1, 2, and 3 completion
- Test environment with database

### Expected Result
- All tests pass
- 200 matches processed in < 3 minutes
- No regressions in existing functionality
- Total test code: ~180 lines across 3 files

### Next Steps
- Phase 5: Documentation and deployment

---

## Phase 5: Documentation and Deployment

### Goal
Document the queue integration and deploy to production environments.

### Tasks

#### Task 5.1 - Update Scheduler Documentation []
**File**: `docs/guides/scheduler-admin-api.md`

**Changes**:
- Add section on queue-based processing
- Document worker configuration
- Explain job lifecycle and retry logic
- Add troubleshooting guide for queue issues

**Estimated Lines**: +100 lines

#### Task 5.2 - Update Environment Configuration Guide []
**File**: `docs/guides/railway-scheduler-deployment.md`

**Changes**:
- Add queue-specific environment variables
- Document worker count configuration
- Add monitoring and health check examples

**Estimated Lines**: +50 lines

#### Task 5.3 - Create Migration Guide []
**File**: `docs/guides/scheduler-queue-migration.md` (new)

**Changes**:
- Document changes from direct to queue-based processing
- Explain performance improvements
- Provide rollback procedure (use direct processing)
- List monitoring points

**Estimated Lines**: +80 lines

#### Task 5.4 - Deploy to Demo Environment []
**Steps**:
1. Deploy updated code to Railway demo
2. Verify pg-boss schema created in database
3. Monitor first cron execution
4. Check worker logs
5. Verify performance metrics

#### Task 5.5 - Deploy to Production []
**Steps**:
1. Review demo performance (minimum 24 hours)
2. Deploy to production with monitoring
3. Compare performance metrics (before/after)
4. Document production performance

### Dependencies
- All previous phases complete and tested
- Railway deployment access

### Expected Result
- Complete documentation
- Successfully deployed to demo and production
- Performance targets met (200 matches in ~2 minutes)
- No production issues

### Next Steps
- Monitoring and optimization (ongoing)

---

## Summary

### Total Code Impact
| Component | New Code | Modified Code | Files |
|-----------|----------|---------------|-------|
| Phase 1 - Orchestrator | ~90 lines | ~10 lines | 1 file |
| Phase 2 - Cron Jobs | ~15 lines | ~20 lines | 1 file |
| Phase 3 - Admin API | ~65 lines | ~20 lines | 1 file |
| Phase 4 - Tests | ~180 lines | 0 lines | 3 files |
| Phase 5 - Docs | ~230 lines | 0 lines | 3 files |
| **TOTAL** | **~580 lines** | **~50 lines** | **9 files** |

### Key Design Wins
1. **No separate job handler classes** - Reuse orchestrator methods
2. **Minimal new files** - Extend existing services instead
3. **Backward compatible** - Falls back to direct processing if queue fails
4. **Leverages existing infrastructure** - pg-boss adapter already built
5. **Smart code reuse** - ~90 lines of integration vs 300+ for separate handlers

### Performance Improvement
- **Before**: 200 matches × 5 seconds = 1,000 seconds (~17 minutes) SEQUENTIAL
- **After**: 200 matches / 10 workers = ~200 seconds (~3 minutes) CONCURRENT
- **Speedup**: 5.7x faster

### Risk Mitigation
- Graceful degradation to direct processing
- Comprehensive testing strategy
- Phased deployment (demo → production)
- Complete documentation
- Rollback plan documented
