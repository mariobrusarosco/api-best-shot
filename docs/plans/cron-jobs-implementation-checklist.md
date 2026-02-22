# Cron Jobs v1 - Micro Task Implementation Plan

Status: Draft  
Date: February 20, 2026  
Scope: Cron-only v1, broken into small logical tasks

## 0) Locked baseline (do not change during implementation)

1. API + Scheduler are separate processes/services.
2. Scheduler runs as dedicated Railway service.
3. Execution mode is Mode A+ only:
   - timer-driven
   - startup recovery for persisted runs
4. No missing-window replay in v1.
5. Overlap policy is `skip`.
6. `run-now` obeys overlap (`skip`).
7. Stale `running` timeout is 15 minutes.
8. Stale `running` rows are marked `failed` (no auto-retry).
9. Targets are validated against code registry (not free text).
10. Pause requires mandatory reason text.
11. Cron run history read is admin-only.
12. Retention target is 180 days (cleanup script later).

## 1) Mentorship execution rule

1. Execute one task at a time.
2. After each task: run verification, share result, then continue.
3. Do not batch multiple tasks in one PR unless explicitly requested.

## 2) Phase A - Database foundation

### A1 - Create cron schema types [x]

1. Add status/schedule/trigger enums in cron domain schema/types.
2. Verify TypeScript compiles.

### A2 - Add `cron_job_definitions` schema [x]

1. Add table fields and constraints.
2. Add indexes for `status`, `target`, `(job_key, version)`, `schedule_type`.

### A3 - Add `cron_job_runs` schema [x]

1. Add table fields and FK to `job_definition_id`.
2. Add indexes for `(status, scheduled_at)`, `(job_key, job_version)`, `target`, `created_at`.
3. Add unique scheduled-slot guard for idempotency:
   - `(job_definition_id, scheduled_at, trigger_type)` for scheduled runs.

### A4 - Register schema exports [x]

1. Export cron schema in `/Users/mariobrusarosco/coding/api-best-shot/src/services/database/schema.ts`.
2. Ensure imports compile.

### A5 - Create migration and apply locally [x]

1. Generate migration.
2. Run migration.
3. Confirm tables/indexes exist.

Checkpoint A (required):

1. `yarn compile` passes.
2. Migration applied locally without manual SQL fixes.

## 3) Phase B - Query layer

### B1 - Definitions queries [x]

1. Create definition.
2. Get by id.
3. List with filters.
4. Pause/resume update.
5. New-version create.

### B2 - Run queries [x]

1. Insert scheduled run with conflict-safe behavior.
2. Insert manual/ad-hoc run.
3. Load pending runs.
4. Mark `running`.
5. Mark `succeeded`.
6. Mark `failed`.
7. Find stale `running` and mark failed.

### B3 - Active-run overlap query [x]

1. Query active run for same definition/version.
2. Return boolean/helper for skip policy.

Checkpoint B (required):

1. Query methods covered by unit/integration tests.
2. Idempotent insert behavior verified.

## 4) Phase C - Service layer (business rules)

### C1 - Target registry service [x]

1. Add code-level target registry.
2. Expose `isValidTarget` and handler resolver.

### C2 - Definitions service rules [x]

1. Validate one-time vs recurring fields.
2. Validate target exists in registry.
3. Enforce versioning workflow.

### C3 - Pause/resume service rules [x]

1. Pause requires reason (min 5, max 300).
2. Resume clears/keeps reason per agreed behavior.

### C4 - Run orchestration helpers [x]

1. Enforce overlap `skip`.
2. Enforce `run-now` also uses overlap `skip`.
3. Build consistent run transition helpers.

Checkpoint C (required):

1. Service tests cover validation and skip logic.
2. Unknown target returns expected error path.

## 5) Phase D - Admin API and routes

### D1 - Route registration [x]

1. Add cron routes under admin v2 router.
2. Protect all cron routes with `AdminMiddleware`.

### D2 - Write endpoints [x]

1. `POST /cron/jobs`
2. `PATCH /cron/jobs/:jobId/pause`
3. `PATCH /cron/jobs/:jobId/resume`
4. `POST /cron/jobs/:jobId/new-version`
5. `POST /cron/jobs/:jobId/run-now`

### D3 - Read endpoints []

1. `GET /cron/jobs`
2. `GET /cron/jobs/:jobId`
3. `GET /cron/runs`
4. `GET /cron/runs/:runId`

### D4 - Response shape normalization []

1. Keep admin responses consistent with existing admin API style.

Checkpoint D (required):

1. Endpoint contract tested (happy path + validation + auth failures).

## 6) Phase E - Scheduler app (new process)

### E1 - Scheduler entrypoint []

1. Create `/Users/mariobrusarosco/coding/api-best-shot/src/scheduler/index.ts`.
2. Initialize env + logger + shutdown hooks.

### E2 - Startup stale-running handling []

1. Find `running` rows older than 15 minutes.
2. Mark them failed with timeout failure code/message.

### E3 - Startup pending recovery []

1. Load `pending` runs.
2. Execute them before timer registration.

### E4 - Timer registration []

1. Load active recurring definitions.
2. Register `node-cron` jobs in memory.
3. Track handles for graceful stop.

### E5 - Timer callback flow []

1. Compute slot.
2. Insert scheduled run (`ON CONFLICT DO NOTHING`).
3. If inserted: transition `pending -> running -> terminal`.

### E6 - One-time behavior []

1. Execute at `run_at`.
2. After terminal run, retire definition internally.

### E7 - Graceful shutdown []

1. Stop new timer triggers.
2. Finish/mark in-flight transitions safely.

Checkpoint E (required):

1. Scheduler starts cleanly.
2. Recovery + timer flow works locally.

## 7) Phase F - Package scripts and local UX

### F1 - Add scheduler scripts []

1. `scheduler:dev`
2. `scheduler:staging`
3. `scheduler:prod`

### F2 - Local runbook []

1. Terminal A: `yarn dev`
2. Terminal B: `yarn scheduler:dev`

Checkpoint F (required):

1. Local two-process development works without manual hacks.

## 8) Phase G - Environment and runtime hardening

### G1 - Scheduler env requirements []

1. Verify scheduler-required env vars exist in staging/prod service configs.
2. Resolve env validation conflicts between API and scheduler runtime.

### G2 - Logging/monitoring tags []

1. Add clear scheduler domain/component tags in logger context.

Checkpoint G (required):

1. Scheduler starts in staging-like env without missing-var crashes.

## 9) Phase H - CI/CD and Railway rollout

### H1 - Railway services setup []

1. Ensure `api-best-shot` exists for API.
2. Create `api-best-shot-scheduler` service for scheduler.

### H2 - Start commands []

1. API command: `node dist/src/index.js`
2. Scheduler command: `node dist/src/scheduler/index.js`

### H3 - Update staging workflow []

1. Build once.
2. Deploy API.
3. Run migrations once.
4. Deploy scheduler.
5. Add post-deploy verification step notes.

### H4 - Update production workflow []

1. Mirror staging dual-service deploy behavior.

Checkpoint H (required):

1. Staging pipeline deploys both services from same commit.

## 10) Phase I - Validation and DoD proof

### I1 - Create DoD recurring job []

1. `*/5` recurring job that prints/logs message.

### I2 - Validate runs []

1. Confirm scheduler logs every 5 minutes.
2. Confirm `cron_job_runs` entries and status transitions.

### I3 - Validate policies []

1. Overlap skip behavior.
2. Run-now skip behavior.
3. Pause reason validation.
4. Unknown target rejection.

### I4 - Validate recovery []

1. Simulate stale running and verify timeout fail path.
2. Simulate pending recovery on scheduler restart.

### I5 - Staging completion []

1. Merge into `staging`.
2. Deploy both services to staging.
3. Capture evidence (logs + DB rows + endpoint output).

Final DoD:

1. Recurring 5-minute cron executes in staging.
2. History visible via admin cron run endpoints.
3. Scheduler deploy is part of CI/CD, not manual.
