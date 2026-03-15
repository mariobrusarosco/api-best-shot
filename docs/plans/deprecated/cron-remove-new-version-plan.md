# Cron New-Version Removal Plan

Status: Completed  
Owner: Backend + Frontend  
Scope: `api-best-shot` + `best-shot`

## Goal

Remove the "new version" workflow from cron jobs.  
From now on, users create jobs from scratch (`POST /admin/cron/jobs`) and manage old jobs via pause/resume/retire behavior.

## Product Contract (target behavior)

1. No `new-version` API endpoint.
2. No "Create new version" UI action.
3. Cron definitions are created only through "new job" flow.
4. Existing jobs remain readable and runnable under current status rules.
5. `paused` means paused for all triggers (already implemented in service queue guard).

## Change Inventory

## Backend (`api-best-shot`)

1. Remove route:
- `src/domains/admin/routes/cron-v2.ts`
  - Delete `POST /jobs/:jobId/new-version`.

2. Remove admin handler + request type:
- `src/domains/admin/api/cron.ts`
  - Remove `CronVersionBody`.
  - Remove `API_ADMIN_CRON.createNewVersion`.

3. Remove domain service versioning flow:
- `src/domains/cron/services/definitions.ts`
  - Keep create-only definition flow.
  - Enforce explicit duplicate job-key guidance (use a different `jobKey`).
- `src/domains/cron/services/index.ts`
  - Export split services only (`CRON_DEFINITION_SERVICE`, `CRON_RUN_SERVICE`, `CRON_EXECUTOR_SERVICE`).

4. Remove query-layer transaction:
- `src/domains/cron/queries/index.ts`
  - Remove `QUERIES_CRON_JOB_DEFINITIONS.createNewVersion(...)`.

5. Keep (for now):
- `version` on definitions and `jobVersion` snapshot on runs.
- `getLatestDefinitionByJobKey` uniqueness check.

Reason: this avoids a broad migration and keeps run-history shape stable.

## Frontend (`best-shot`)

1. Remove API hook and types for version creation:
- `src/domains/admin/hooks/use-admin-cron.ts`
  - Remove `ICronNewVersionResult`.
  - Remove `ICreateCronJobVersionInput`.
  - Remove `createCronJobVersion(...)`.
  - Remove `useAdminCreateCronJobVersion()`.

2. Simplify cron form mode:
- `src/domains/admin/components/cron/cron-job-form-modal.tsx`
  - Change `CronFormMode` from `"create" | "new-version"` to `"create"` only.
  - Simplify title logic and remove mode branching.

3. Remove "new version" from jobs list flow:
- `src/domains/admin/pages/cron-jobs.tsx`
  - Remove `formMode` / `selectedVersionJobId` state.
  - Remove `handleNewVersion`.
  - Remove save-branch for version creation; keep create-only save path.
  - Remove imports related to create-version hook/types.

4. Remove "new version" from job detail flow:
- `src/domains/admin/pages/cron-job-detail.tsx`
  - Remove "Create new version" button.
  - Remove version modal state and handlers (`isVersionFormOpen`, `saveNewVersion`, etc.).
  - Remove imports/types/hooks used only by version flow.

## Schema / DB Cleanup (to drop supersede functionality 100%)

1. Remove supersede column from schema:
- `src/domains/cron/schema/index.ts`
  - Delete `supersedesJobId`.

2. Add migration:
- `supabase/migrations/<new_migration>.sql`
  - `ALTER TABLE cron_job_definitions DROP COLUMN supersedes_job_id;`

3. Regenerate migration metadata snapshots:
- `supabase/migrations/meta/*` (project-generated artifacts).

4. Frontend type cleanup after backend schema update:
- `best-shot/src/domains/admin/hooks/use-admin-cron.ts`
  - Remove `supersedesJobId` from `ICronJobDefinition`.

Note:
- Do **not** remove `version` / `jobVersion` in this phase unless explicitly desired.
- Removing version columns is a larger data-contract migration and not required to eliminate supersede behavior.

## Documentation Updates

1. Update active guide:
- `api-best-shot/docs/guides/cron-jobs-engineering-guide.md`
  - Remove endpoint reference to `/jobs/:jobId/new-version`.
  - Replace guidance with "create new job from scratch".

2. Update planning docs that are still used operationally:
- `api-best-shot/docs/plans/cron-jobs-implementation-checklist.md`
- `api-best-shot/docs/plans/cron-jobs-pdr.md`
- `api-best-shot/docs/plans/cron-jobs-fundamentals.md`

Action:
- Mark "new-version" sections as deprecated/removed, or update to current create-only contract.

## Suggested Execution Order

1. Frontend: remove "Create new version" UI paths first (prevents new calls).
2. Backend: remove endpoint + service/query implementation.
3. Deploy frontend + backend together.
4. Apply DB migration dropping `supersedes_job_id`.
5. Update docs.

## Verification Checklist

1. `POST /api/v2/admin/cron/jobs/:jobId/new-version` is unavailable (404/route missing).
2. Cron UI has no "Create new version" action.
3. Creating new job still works for recurring and one-time.
4. Pause/resume still works.
5. Run-now still works for active jobs and is blocked for paused jobs per current policy.
6. Scheduler still executes active recurring jobs and records runs.
7. Existing cron runs remain queryable (no changes to run API contract).

## Rollback Plan

1. Re-introduce route + handler + hook if needed (single feature rollback).
2. If DB migration is already applied, rollback requires forward-fix migration to re-add `supersedes_job_id` (avoid destructive rollback in place).
