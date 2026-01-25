# Scoreboard V2 + BullMQ Migration Plan

**Goal:** Migrate entire queue system to BullMQ and implement V2 scoreboard with streaming for memory safety and 1M+ user scalability.

**Timeline:** 5 days
**Status:** Awaiting Approval

---

# Phase 1: BullMQ Adapter Implementation

## Goal

Create BullMQ adapter that implements the IQueue interface, enabling seamless swap from PgBoss to BullMQ without changing any application code.

## Tasks

### Task 1.1 - Install BullMQ Dependencies []

#### Task 1.1.a - Add BullMQ package []
- Add `bullmq` package to dependencies
- Verify version compatibility with current Node.js version

#### Task 1.1.b - Verify Redis connection []
- Confirm REDIS_URL environment variable exists
- Test Redis connectivity from application

### Task 1.2 - Create BullMQ Adapter []

#### Task 1.2.a - Create adapter file structure []
- Create `src/services/queue/bullmq-adapter.ts`
- Import BullMQ types and IQueue interface

#### Task 1.2.b - Implement IQueue interface methods []
- Implement `start()` method
- Implement `stop()` method
- Implement `createQueue()` method
- Implement `send()` method
- Implement `work()` method (both overloads)
- Implement `offWork()` method
- Implement `getJobById()` method
- Implement `deleteQueue()` method
- Implement `deleteAllJobs()` method

#### Task 1.2.c - Add underlying queue accessor []
- Implement `getUnderlyingQueue()` method
- Return BullMQ Queue instance for advanced operations

#### Task 1.2.d - Handle connection management []
- Store Redis connection configuration
- Manage queue instances in Map
- Manage worker instances in Map

### Task 1.3 - Update Queue Factory []

#### Task 1.3.a - Add feature flag support []
- Read `QUEUE_SYSTEM` environment variable
- Default to 'pgboss' if not set

#### Task 1.3.b - Add adapter selection logic []
- If QUEUE_SYSTEM=bullmq, use BullMQAdapter
- If QUEUE_SYSTEM=pgboss, use PgBossAdapter
- Log which adapter is being used

### Task 1.4 - Type Safety Verification []

#### Task 1.4.a - Verify TypeScript compilation []
- Run `yarn compile`
- Fix any type errors

#### Task 1.4.b - Verify interface compliance []
- Ensure all IQueue methods are implemented
- Ensure method signatures match interface

## Dependencies

- Redis must be available and accessible
- IQueue interface must not change
- PgBoss adapter must remain functional (for rollback)

## Expected Result

- BullMQ adapter implements IQueue fully
- TypeScript compiles without errors
- Adapter can be selected via QUEUE_SYSTEM env var
- No application code changes needed yet

## Next Steps

Phase 2: Match Queue Migration

---

# Phase 2: Match Queue Migration to BullMQ

## Goal

Migrate existing match update queue from PgBoss to BullMQ, verify functionality, and ensure zero downtime during migration.

## Tasks

### Task 2.1 - Deploy with Feature Flag Disabled []

#### Task 2.1.a - Set environment variables []
- Set `QUEUE_SYSTEM=pgboss` in demo environment
- Keep current behavior (PgBoss)

#### Task 2.1.b - Deploy to demo []
- Deploy updated code with BullMQ adapter (inactive)
- Verify deployment successful
- Verify match updates still work with PgBoss

### Task 2.2 - Enable BullMQ in Demo []

#### Task 2.2.a - Switch queue system []
- Change `QUEUE_SYSTEM=bullmq` in demo environment
- Restart scheduler service

#### Task 2.2.b - Verify queue initialization []
- Check logs for "Queue workers initialized successfully"
- Check logs for adapter type (should show BullMQ)
- Verify 10 workers registered

### Task 2.3 - Verify Match Updates []

#### Task 2.3.a - Test automatic cron execution []
- Wait for next cron trigger (within 10 minutes)
- Verify matches are queued
- Verify workers process jobs

#### Task 2.3.b - Test manual trigger []
- Call admin API: POST /scheduler/trigger-match-polling
- Verify jobs queued in Redis
- Verify jobs complete successfully

### Task 2.4 - Verify Redis Queue State []

#### Task 2.4.a - Check Redis keys []
- Connect to Redis
- Verify `bull:update-match:*` keys exist
- Verify job data structure is correct

#### Task 2.4.b - Check queue statistics []
- Call admin API: GET /scheduler/queue-stats
- Verify response shows BullMQ
- Verify pending jobs count

### Task 2.5 - Monitor Performance []

#### Task 2.5.a - Compare metrics with PgBoss []
- Memory usage (should be same or lower)
- Job processing time (should be same or faster)
- Success rate (should be e95%)

#### Task 2.5.b - Monitor for 4 hours []
- Check for errors in logs
- Check for memory spikes
- Check for failed jobs

### Task 2.6 - Database Cleanup Verification []

#### Task 2.6.a - Verify PgBoss tables empty []
- Query `pgboss.job` table
- Should have no new jobs (old ones may remain)

#### Task 2.6.b - Verify Redis has jobs []
- Check Redis for active jobs
- Compare count with expected matches

## Dependencies

- Phase 1 completed
- Demo environment accessible
- Admin API access token available
- Redis accessible via Railway CLI or redis-cli

## Expected Result

- Match updates running on BullMQ in demo
- Performance equal or better than PgBoss
- Zero errors or crashes
- Admin API shows BullMQ queue stats

## Next Steps

Monitor demo for 24-48 hours, then Phase 3: Streaming Service Implementation

---

# Phase 3: Streaming Service Implementation

## Goal

Implement memory-safe guess streaming service that processes guesses in fixed-size batches, preventing OOM crashes for large tournaments.

## Tasks

### Task 3.1 - Create Streaming Service File []

#### Task 3.1.a - Create service file structure []
- Create `src/domains/score/services/scoreboard-streaming.service.ts`
- Import required types and database client

#### Task 3.1.b - Add configuration constants []
- Define default batch size (1000)
- Define configurable batch size from env var

### Task 3.2 - Implement Keyset Pagination Generator []

#### Task 3.2.a - Create async generator function []
- Function signature: `streamGuessesInBatches(matchId, batchSize)`
- Return type: AsyncGenerator yielding Guess arrays

#### Task 3.2.b - Implement pagination logic []
- Track last processed ID
- Query with `WHERE id > lastId` condition
- Order by ID ascending
- Limit to batch size
- Yield batch to caller
- Update lastId from last item in batch
- Break when batch is empty

#### Task 3.2.c - Add logging []
- Log batch number
- Log guesses per batch
- Log total batches processed

### Task 3.3 - Implement Streaming Calculation []

#### Task 3.3.a - Create streaming calculation function []
- Function signature: `calculatePointsStreaming(matchId)`
- Return type: Promise<Map<string, number>>

#### Task 3.3.b - Implement batch processing []
- Initialize empty deltas Map
- For each batch from stream:
  - Calculate points for each guess
  - Accumulate points in deltas Map
  - Allow garbage collection between batches

#### Task 3.3.c - Add performance logging []
- Log start time
- Log total guesses processed
- Log unique members affected
- Log total duration

### Task 3.4 - Reuse Existing Point Calculation []

#### Task 3.4.a - Import existing logic []
- Import from existing ScoreboardService
- Use `calculateGuessPoints()` method

#### Task 3.4.b - Verify compatibility []
- Ensure method accepts single guess
- Ensure method returns point value
- No changes to calculation logic needed

### Task 3.5 - Add TypeScript Types []

#### Task 3.5.a - Export streaming function types []
- Export generator type if needed
- Export function signatures

#### Task 3.5.b - Verify type compilation []
- Run `yarn compile`
- Fix any type errors

## Dependencies

- Phase 2 completed (BullMQ working in demo)
- Existing ScoreboardService must remain unchanged
- Database queries must use existing Drizzle setup

## Expected Result

- Streaming service processes guesses in batches
- Memory usage constant (~500KB) regardless of tournament size
- TypeScript compiles without errors
- Ready to integrate with scoreboard queue

## Next Steps

Phase 4: Scoreboard Queue Integration

---

# Phase 4: Scoreboard Queue Integration

## Goal

Create separate queue for scoreboard updates, decouple from match jobs, register dedicated workers, and implement feature flag for safe rollout.

## Tasks

### Task 4.1 - Create Scoreboard Job Type []

#### Task 4.1.a - Create job type definition file []
- Create `src/domains/scheduler/types/scoreboard-job.ts`
- Define ScoreboardJobData interface

#### Task 4.1.b - Define job data structure []
- Include matchId
- Include tournamentId
- Include matchExternalId (for logging)

### Task 4.2 - Register Scoreboard Workers []

#### Task 4.2.a - Add worker registration method []
- Add to MatchUpdateOrchestratorService
- Method: `registerScoreboardWorkers(queue: IQueue)`

#### Task 4.2.b - Implement registration logic []
- Create queue: 'calculate-scoreboard'
- Register workers with teamSize: 5
- Register workers with teamConcurrency: 1
- Pass job handler

#### Task 4.2.c - Add worker logging []
- Log successful worker registration
- Log worker count
- Log queue name

### Task 4.3 - Implement Scoreboard Job Processor []

#### Task 4.3.a - Create job processor method []
- Add to MatchUpdateOrchestratorService
- Method: `processScoreboardJob(data: ScoreboardJobData)`

#### Task 4.3.b - Implement job processing logic []
- Call streaming service: `calculatePointsStreaming()`
- Call existing service: `ScoreboardService.applyScoreUpdates()`
- Add comprehensive logging

#### Task 4.3.c - Add error handling []
- Catch scoreboard errors
- Log error details
- Re-throw to trigger queue retry

### Task 4.4 - Update Match Job to Enqueue []

#### Task 4.4.a - Add feature flag check []
- Check `SCOREBOARD_V2_ENABLED` environment variable
- Check if queue is available

#### Task 4.4.b - Implement V2 path (enqueue) []
- If V2 enabled and queue available:
  - Send scoreboard job to queue
  - Include retry configuration
  - Log job queued

#### Task 4.4.c - Keep V1 path (synchronous) []
- If V2 disabled or queue unavailable:
  - Call existing synchronous method
  - Swallow scoreboard errors
  - Log V1 mode used

### Task 4.5 - Initialize Workers on Startup []

#### Task 4.5.a - Update cron-jobs.ts startup []
- After match workers registered
- Check if SCOREBOARD_V2_ENABLED=true

#### Task 4.5.b - Register scoreboard workers []
- Call orchestrator.registerScoreboardWorkers()
- Log configuration details

#### Task 4.5.c - Add startup logging []
- Log scoreboard mode (V1 or V2)
- Log worker count if V2
- Log queue name if V2

### Task 4.6 - Add Graceful Shutdown []

#### Task 4.6.a - Update shutdown function []
- Ensure stopQueue() called before exit
- BullMQ workers finish current jobs

#### Task 4.6.b - Add shutdown logging []
- Log worker shutdown
- Log queue disconnection

## Dependencies

- Phase 3 completed (streaming service ready)
- BullMQ adapter working
- Match queue stable in demo

## Expected Result

- Scoreboard jobs queued separately from match jobs
- 5 dedicated workers process scoreboard jobs
- Feature flag controls V1/V2 behavior
- Graceful startup and shutdown

## Next Steps

Phase 5: Testing and Deployment

---

# Phase 5: Testing and Deployment

## Goal

Test V2 implementation in demo environment, verify memory safety, verify performance, and deploy to production with monitoring.

## Tasks

### Task 5.1 - Deploy V2 Disabled []

#### Task 5.1.a - Set environment variables []
- Set `QUEUE_SYSTEM=bullmq` (matches already on BullMQ)
- Set `SCOREBOARD_V2_ENABLED=false` (V2 inactive)

#### Task 5.1.b - Deploy to demo []
- Deploy code with V2 implementation
- Verify deployment successful
- Verify scheduler starts correctly

#### Task 5.1.c - Verify V1 still works []
- Trigger match update
- Verify scoreboard updates synchronously
- Verify no errors

### Task 5.2 - Enable V2 in Demo []

#### Task 5.2.a - Switch feature flag []
- Set `SCOREBOARD_V2_ENABLED=true`
- Restart scheduler service

#### Task 5.2.b - Verify scoreboard workers start []
- Check logs for worker registration
- Verify 5 workers initialized
- Verify queue created

### Task 5.3 - Test Scoreboard V2 []

#### Task 5.3.a - Trigger match ending []
- Update match status to 'ended' manually
- Or wait for real match to end

#### Task 5.3.b - Verify job queued []
- Check Redis for scoreboard job
- Verify job data structure correct

#### Task 5.3.c - Verify job processing []
- Check logs for streaming messages
- Check logs for batch processing
- Verify job completes

#### Task 5.3.d - Verify scoreboard updated []
- Check PostgreSQL: T_TournamentMember.points updated
- Check Redis: tournament:*:master_scores updated
- Verify points match expected values

### Task 5.4 - Monitor Memory Usage []

#### Task 5.4.a - Check Railway metrics []
- View scheduler service memory graph
- Should stay constant during scoreboard updates
- Should not spike above 100MB for scoreboard

#### Task 5.4.b - Test with high-guess match []
- Find or create match with many guesses
- End match and trigger scoreboard
- Verify memory stays constant

### Task 5.5 - Monitor Performance []

#### Task 5.5.a - Measure scoreboard job duration []
- Check logs for duration
- Should complete in < 30 seconds for normal tournaments
- Should complete in < 3 minutes for 1M guesses

#### Task 5.5.b - Compare with V1 baseline []
- If possible, compare duration with V1
- V2 may be slightly slower but safer

### Task 5.6 - Monitor for 24 Hours []

#### Task 5.6.a - Check error rates []
- No increase in errors
- Scoreboard job success rate > 95%

#### Task 5.6.b - Check queue health []
- Pending jobs stay low
- No job backlog

#### Task 5.6.c - Check data consistency []
- PostgreSQL and Redis scores match
- No duplicate updates

### Task 5.7 - Deploy to Production []

#### Task 5.7.a - Set production environment []
- Set `QUEUE_SYSTEM=bullmq`
- Set `SCOREBOARD_V2_ENABLED=true`

#### Task 5.7.b - Deploy to production []
- Deploy via Railway
- Monitor deployment

#### Task 5.7.c - Verify production startup []
- Check logs for successful initialization
- Verify both queues registered
- Verify workers started

### Task 5.8 - Monitor Production []

#### Task 5.8.a - Monitor first 4 hours []
- Check for errors
- Check memory usage
- Check job completion rates

#### Task 5.8.b - Verify first scoreboard updates []
- When matches end, verify jobs queued
- Verify jobs complete successfully
- Verify scoreboards updated correctly

### Task 5.9 - Update Admin API []

#### Task 5.9.a - Enhance queue stats endpoint []
- Show both queues in response
- Show match queue stats
- Show scoreboard queue stats
- Show V2 enabled status

#### Task 5.9.b - Test admin endpoints []
- GET /scheduler/queue-stats
- Verify shows both queues
- GET /scheduler/jobs/:jobId
- Verify works for scoreboard jobs

### Task 5.10 - Update Documentation []

#### Task 5.10.a - Update scheduler-admin-api.md []
- Document V2 scoreboard behavior
- Document feature flags
- Update example responses

#### Task 5.10.b - Update railway-scheduler-deployment.md []
- Document new environment variables
- Document BullMQ monitoring
- Update deployment checklist

#### Task 5.10.c - Create migration completion doc []
- Document final architecture
- Document rollback procedures
- Document monitoring guidelines

## Dependencies

- Phase 4 completed
- Demo environment stable with BullMQ
- Admin API access available
- Railway metrics accessible

## Expected Result

- V2 working in demo and production
- Memory usage constant
- No increase in errors
- Documentation updated
- Monitoring in place

## Next Steps

Post-deployment monitoring and optimization

---

# Post-Deployment Tasks

## Optional Cleanup (After 1 Week of Stable V2)

### Task: Remove PgBoss Dependency []

#### Subtask a - Verify V2 stable []
- Confirm no issues for 7 days
- Confirm no rollbacks needed

#### Subtask b - Remove feature flag []
- Hardcode QUEUE_SYSTEM to 'bullmq'
- Remove conditional logic

#### Subtask c - Uninstall PgBoss []
- Remove pg-boss package
- Remove PgBossAdapter file
- Clean up pgboss schema in PostgreSQL

## Future Optimizations

### Task: Tune Batch Size []
- Test different batch sizes
- Measure memory vs performance
- Update default if needed

### Task: Add BullMQ Dashboard []
- Install @bull-board packages
- Mount BullMQ Board UI
- Expose on admin route

### Task: Advanced Monitoring []
- Add Sentry tracking for queue jobs
- Add custom metrics
- Set up alerts

---

**Plan Status:** Ready for Review
**Next Action:** Await user approval to begin Phase 1
