# Cron Jobs v1 - Implementation Checklist

Status: Draft  
Date: February 20, 2026  
Scope: Cron-only v1 implementation checklist (exhaustive)

## 0) Locked decisions (baseline)

1. Two processes/services: API + Scheduler.
2. Scheduler is dedicated service/process on Railway.
3. Mode A+ only: timer-driven + startup recovery.
4. Missing windows are not replayed in v1.
5. Overlap policy: `skip`.
6. `run-now` obeys overlap (`skip`).
7. Stale `running` timeout: 15 minutes, mark as `failed`.
8. `target` validation via code-level registry.
9. Pause requires mandatory reason.
10. Run history reads are admin-only.
11. Retention target: 180 days, cleanup script later.

## 1) Database and schema

1. Create `cron_job_definitions` table migration.
2. Create `cron_job_runs` table migration.
3. Add required indexes:
   - definitions: `status`, `target`, `(job_key, version)`, `schedule_type`
   - runs: `(status, scheduled_at)`, `job_definition_id`, `(job_key, job_version)`, `target`, `created_at`
4. Add unique slot guard for scheduled runs:
   - `(job_definition_id, scheduled_at, trigger_type)`
5. Add DB constraints for one-time vs recurring:
   - recurring requires `cron_expression`
   - one-time requires `run_at`
6. Register schema exports in `/Users/mariobrusarosco/coding/api-best-shot/src/services/database/schema.ts`.

## 2) Cron domain module structure

1. Create domain folder:
   - `/Users/mariobrusarosco/coding/api-best-shot/src/domains/cron/schema`
   - `/Users/mariobrusarosco/coding/api-best-shot/src/domains/cron/queries`
   - `/Users/mariobrusarosco/coding/api-best-shot/src/domains/cron/services`
   - `/Users/mariobrusarosco/coding/api-best-shot/src/domains/cron/api`
   - `/Users/mariobrusarosco/coding/api-best-shot/src/domains/cron/routes`
2. Define strong types for statuses, schedule types, trigger types.
3. Add query methods:
   - create/update/get definitions
   - insert run with idempotent conflict handling
   - claim/mark run transitions
   - stale-running selector/updater
   - pending-runs loader

## 3) Target registry

1. Create code registry:
   - `/Users/mariobrusarosco/coding/api-best-shot/src/scheduler/target-registry.ts`
2. Include target metadata:
   - `target` key
   - handler function
3. Validation behavior:
   - unknown target rejected at API layer with 400

## 4) Admin API

1. Add routes under admin v2:
   - `POST /api/v2/admin/cron/jobs`
   - `GET /api/v2/admin/cron/jobs`
   - `GET /api/v2/admin/cron/jobs/:jobId`
   - `PATCH /api/v2/admin/cron/jobs/:jobId/pause`
   - `PATCH /api/v2/admin/cron/jobs/:jobId/resume`
   - `POST /api/v2/admin/cron/jobs/:jobId/new-version`
   - `POST /api/v2/admin/cron/jobs/:jobId/run-now`
   - `GET /api/v2/admin/cron/runs`
   - `GET /api/v2/admin/cron/runs/:runId`
2. Enforce `AdminMiddleware` on all cron admin endpoints.
3. Validate pause reason:
   - required
   - min 5 / max 300 chars
4. Enforce overlap rule in run-now path (`skip` if active run exists).

## 5) Scheduler app (new process)

1. Create entrypoint:
   - `/Users/mariobrusarosco/coding/api-best-shot/src/scheduler/index.ts`
2. Create runtime orchestration:
   - `/Users/mariobrusarosco/coding/api-best-shot/src/scheduler/runtime.ts`
3. Startup flow:
   - mark stale running (>15m) as failed
   - execute pending runs
   - register recurring timers from active definitions
4. Timer flow:
   - compute slot
   - insert scheduled run (`ON CONFLICT DO NOTHING`)
   - if inserted, `pending -> running -> terminal`
5. One-time flow:
   - execute once at `run_at`
   - update definition to `retired` after terminal run
6. Graceful shutdown:
   - stop timers
   - finish in-flight run transition safely

## 6) Package scripts and local runtime

1. Add scripts to `/Users/mariobrusarosco/coding/api-best-shot/package.json`:
   - `scheduler:dev`
   - `scheduler:staging`
   - `scheduler:prod`
2. Local manual runbook:
   - terminal A: `yarn dev`
   - terminal B: `yarn scheduler:dev`

## 7) Environment and config hardening

1. Ensure scheduler has required env vars in staging/prod.
2. If needed, split env validation profile so scheduler does not require unrelated API-only vars.
3. Validate logger + Sentry integration works in scheduler process.

## 8) CI/CD and Railway deployment

1. Create/prepare separate Railway scheduler service:
   - `api-best-shot-scheduler`
2. Use same build artifact/image.
3. Configure start command:
   - API: `node dist/src/index.js`
   - Scheduler: `node dist/src/scheduler/index.js`
4. Update staging workflow:
   - build + quality gates
   - deploy API
   - run migrations once
   - deploy scheduler
5. Mirror same pattern in production workflow when ready.

## 9) Validation and testing

1. Unit tests:
   - overlap skip logic
   - target validation
   - idempotent insert behavior
   - stale-running timeout behavior
2. Integration tests:
   - admin create recurring + scheduler execution
   - pause/resume flow
   - new-version flow
   - run-now skip when active run exists
3. Manual staging checks:
   - create DoD job (`*/5`)
   - confirm scheduler logs firing every 5 min
   - confirm `cron_job_runs` rows created
   - simulate stale run and verify fail transition

## 10) Definition of Done verification

1. Recurring job runs every 5 minutes and prints/logs message.
2. Run history appears through admin cron run endpoints.
3. Code merged into `staging`.
4. Staging deployment includes API + scheduler processes.
5. Production-like validation completed on staging.
