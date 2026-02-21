# Cron Jobs Fundamentals (Mentorship Companion)

Status: Reference  
Date: February 20, 2026  
Purpose: Teach fundamentals before implementation or architecture tradeoffs.

## 1) What is a cron job (plain English)

A cron job is a rule that says:

1. **When** to run (schedule).
2. **What** to trigger (target action).

Example:

1. Every 5 minutes.
2. Trigger `search_for_knockout_rounds`.

## 2) The most important distinction

1. **Schedule definition**: config describing a future behavior.
2. **Run record**: one real execution that happened (or failed).

If you remember only one thing, remember this split.

## 3) Cron expression vs one-time timestamp

1. Cron expression = recurring pattern (`*/5 * * * *`).
2. One-time run = specific timestamp (`2026-02-21T15:00:00Z`).

That is why we keep both:

1. `cron_expression` for recurring.
2. `run_at` for one-time.

## 4) Where cron actually runs

Cron does not run in the database by default. It runs in a process.

In this project, that process can be:

1. API process (embedded cron).
2. Dedicated scheduler process (separate service).

When someone says “app is down,” the critical meaning is:

1. The process that owns cron scheduling is offline.

## 5) Your hosting reality (this repo)

From workflows in this repo:

1. API is deployed to Railway (`api-best-shot` service).
2. Staging deployment is branch-driven via `staging`.

So if cron is embedded in API, API restarts/downtime affect cron firing.

## 6) Why missed jobs happen

If scheduler process is offline at scheduled time:

1. In-memory cron callback cannot fire.
2. On restart, default cron libraries do not magically replay missed callbacks.

So “restart” does not equal “catch up.”

## 7) V1 execution mode (only one mode in this project phase)

Mode A+ (timer-driven with startup recovery):
1. Register cron timers in memory.
2. Execute when callback fires.
3. On startup, recover persisted `pending` runs.
4. On startup, mark stale `running` runs as `failed` (timeout 15 minutes).
5. Do not replay never-recorded missing windows in v1.

## 8) Idempotency in one sentence

For each definition version and due window, create at most one run record.

Practical shape:

1. Unique key like `(job_definition_id, scheduled_at, trigger_type='scheduled')`.
2. Insert with conflict handling (no duplicate run).

## 9) Overlap policy (easy mental model)

Question: what if next schedule comes while previous run is still running?

Common answers:

1. `skip` new window.
2. `delay` and run later.

Pick one policy and make it explicit.

## 10) Why we store both FK and snapshot fields in runs

In `cron_job_runs`:

1. FK (`job_definition_id`) gives relational integrity.
2. Snapshot (`job_key`, `target`, `job_version`) gives stable audit and easier queries.

This is normal for operational/execution history tables.

## 11) Lifecycle fundamentals

Definition lifecycle:

1. `active`
2. `paused`
3. `retired`

Run lifecycle:

1. `pending`
2. `running`
3. terminal: `succeeded`, `failed`, `canceled`, or `skipped`

## 12) Failure handling baseline

When a run fails, store:

1. failure code
2. short message
3. details (stack/context)
4. started/finished timestamps

No auto-retry is still valid for v1.

## 13) Versioning baseline

`new-version` exists so we do not mutate history in place.

Pattern:

1. Pause/retire failing version.
2. Create version N+1.
3. Keep old runs tied to old version for audit.

## 14) Mentorship checklist before coding

Before implementation, confirm you can answer “yes” to all:

1. Do I know where cron runs (API vs scheduler process)?  
Answer: Yes.
2. Do I know what happens if that process is down?  
Answer: Yes.
3. Do I know the locked v1 mode (Mode A+)?  
Answer: Yes.
4. Do I know one-time vs recurring data model fields?  
Answer: Yes.
5. Do I know overlap policy?  
Answer: Yes.
6. Do I know how duplicates are prevented?  
Answer: Yes.
7. Do I know how failure is recorded?  
Answer: Yes.
8. Do I know why versioning endpoint exists?  
Answer: Yes.

If any answer is “no”, stop and clarify before coding.

## 15) Locked decisions (v1)

1. Topology: run two processes/services.
2. API process handles HTTP.
3. Scheduler process handles cron timers and execution orchestration.
4. Hosting/deploy target: Railway (same codebase, separate process/service runtime).
5. Execution mode: Mode A+ (timer-driven with startup recovery of persisted runs).
6. Missing windows: do not replay never-recorded windows in v1.
7. Overlap policy: `skip` when previous run for same definition/version is still `running`.
8. Duplicate prevention: unique scheduled slot key + `ON CONFLICT DO NOTHING` + atomic `pending -> running` claim.
9. Failure recording: persist `failure_code`, `failure_message`, `failure_details`, `started_at`, `finished_at`.
10. Versioning: keep `new-version` endpoint to avoid mutating historical job definitions.
11. Startup stale-running timeout: `15 minutes`.
12. Startup stale-running action: mark stale `running` rows as `failed` with timeout reason; do not auto-retry.
13. Run history retention target: 180 days (cleanup script in future iteration).
14. Target labels: validated against code-level target registry in v1 (not free text).
15. `run-now` obeys overlap policy (`skip` if same definition/version already running).
16. Pause requires mandatory reason text.
17. Cron run history read access: admin-only.

## 16) No remaining blockers for v1 fundamentals

1. Fundamentals are locked for cron-only v1.
