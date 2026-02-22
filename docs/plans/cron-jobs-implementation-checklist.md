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

1. Export cron schema in `/Users/mariobrusarosco/coding/api-best-shot/src/core/database/schema.ts`.
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

### D3 - Read endpoints [x]

1. `GET /cron/jobs`
2. `GET /cron/jobs/:jobId`
3. `GET /cron/runs`
4. `GET /cron/runs/:runId`

### D4 - Response shape normalization [x]

1. Keep admin responses consistent with existing admin API style.

Checkpoint D (required):

1. Endpoint contract tested (happy path + validation + auth failures).

## 6) Phase E0 - Architecture and CI/CD foundation

### E0.1 - Naming and structure contract [x]

1. Create ADR locking folder semantics:
2. `apps` = deployable runtimes.
3. `domains` = business logic.
4. `core` = shared infrastructure adapters.
5. Lock target structure:
6. `/Users/mariobrusarosco/coding/api-best-shot/src/apps`
7. `/Users/mariobrusarosco/coding/api-best-shot/src/domains`
8. `/Users/mariobrusarosco/coding/api-best-shot/src/core`

### E0.2 - App entrypoints split [x]

1. Create `/Users/mariobrusarosco/coding/api-best-shot/src/apps/api/index.ts`.
2. Create `/Users/mariobrusarosco/coding/api-best-shot/src/apps/scheduler/index.ts`.
3. Move API bootstrap from `/Users/mariobrusarosco/coding/api-best-shot/src/index.ts` to `/Users/mariobrusarosco/coding/api-best-shot/src/apps/api/index.ts`.
4. Keep `/Users/mariobrusarosco/coding/api-best-shot/src/index.ts` as temporary forwarder during transition.

### E0.3 - Shared infra rename (`services` -> `core`) [x]

1. Rename `/Users/mariobrusarosco/coding/api-best-shot/src/services` to `/Users/mariobrusarosco/coding/api-best-shot/src/core`.
2. Refactor all imports from `@/services/*` to `@/core/*`.
3. Keep runtime behavior unchanged while renaming.

### E0.4 - Script split for two processes [x]

1. Add `dev:api`, `dev:scheduler`, and `dev:stack`.
2. Add explicit serve scripts for both processes per environment.
3. Keep temporary compatibility aliases while migration is in progress.

### E0.5 - CI pipeline update [x]

1. Build once in CI.
2. Reuse build artifact for deploy jobs.
3. Keep lint, compile, and test gates before deployment jobs.

### E0.6 - CD workflow update (staging, production, demo) []

1. Deploy API service first.
2. Run database migrations once.
3. Deploy scheduler service second.
4. Add workflow concurrency guards per environment.
5. Add scheduler environment and secrets checklist.

### E0.7 - Post-deploy verification []

1. Verify API health endpoint.
2. Verify scheduler startup heartbeat/log.
3. Trigger run-now smoke check and confirm `cron_job_runs` write.

Checkpoint E0 (required):

1. Both processes start locally from `src/apps/*`.
2. CI and CD workflows are dual-service aware.
3. No `@/services/*` imports remain.

## 7) Phase E - Scheduler app (new process)

### E1 - Scheduler entrypoint []

1. Create `/Users/mariobrusarosco/coding/api-best-shot/src/apps/scheduler/index.ts`.
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

## 8) Phase F - Package scripts and local UX

### F1 - Add scheduler scripts []

1. Add local process scripts:
2. `dev:api`
3. `dev:scheduler`
4. `dev:stack`
5. Add environment serve scripts:
6. `serve:api:staging`
7. `serve:api:prod`
8. `serve:scheduler:staging`
9. `serve:scheduler:prod`

### F2 - Local runbook []

1. Option A (single command): `yarn dev:stack`
2. Option B (split terminals):
3. Terminal A: `yarn dev:api`
4. Terminal B: `yarn dev:scheduler`

Checkpoint F (required):

1. Local two-process development works without manual hacks.

## 9) Phase G - Environment and runtime hardening

### G1 - Scheduler env requirements []

1. Verify scheduler-required env vars exist in staging/prod service configs.
2. Resolve env validation conflicts between API and scheduler runtime.

### G2 - Logging/monitoring tags []

1. Add clear scheduler domain/component tags in logger context.

Checkpoint G (required):

1. Scheduler starts in staging-like env without missing-var crashes.

## 10) Phase H - CI/CD and Railway rollout

### H1 - Railway services setup []

1. Ensure `api-best-shot` exists for API.
2. Create `api-best-shot-scheduler` service for scheduler.

### H2 - Start commands []

1. API command: `node dist/src/apps/api/index.js`
2. Scheduler command: `node dist/src/apps/scheduler/index.js`

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

## 11) Phase I - Validation and DoD proof

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
