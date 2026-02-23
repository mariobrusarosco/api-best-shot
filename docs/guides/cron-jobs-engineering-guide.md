# Cron Jobs Engineering Guide

Status: Active  
Audience: Backend engineers working on cron jobs

## 1) Current reality (today)

1. We support recurring and one-time cron job definitions.
2. Cron definitions are created via admin API.
3. Scheduler executes definitions and writes run history.
4. Right now, only one target is registered:
   - `system.print_message`

## 2) Core mental model

Think in three parts:

1. Definition (`what/when`)
2. Scheduler app (`runtime execution engine`)
3. Runs (`history/audit`)

Visual:

```text
[Admin API: create definition]
        |
        v
[cron_job_definitions]
        |
        | scheduler loads active definitions
        v
[Scheduler app timers + execution]
        |
        v
[cron_job_runs]
```

Current code boundaries:

1. `CRON_DEFINITION_SERVICE` (`src/domains/cron/services/definitions.ts`)
2. `CRON_RUN_SERVICE` (`src/domains/cron/services/runs.ts`)
3. `CRON_EXECUTOR_SERVICE` (`src/domains/cron/services/executor.ts`)

## 3) First recurring cron job (end-to-end)

### Step A: Create definition from UI or API

Endpoint:

```text
POST /api/v2/admin/cron/jobs
```

Example payload:

```json
{
  "jobKey": "first_heartbeat_job",
  "target": "system.print_message",
  "payload": { "message": "Hello every 5 minutes" },
  "scheduleType": "recurring",
  "cronExpression": "*/5 * * * *",
  "timezone": "UTC"
}
```

### Step B: What API does

1. Validates fields.
2. Validates `target` exists in registry.
3. Stores active definition in `cron_job_definitions`.

### Step C: Scheduler execution

Scheduler loads active recurring definitions and registers timers.

Important current behavior:

1. Recurring definitions are registered on scheduler startup.
2. If scheduler is already running when you create a new recurring job, restart/redeploy scheduler once so the new definition is loaded.

### Step D: Run lifecycle

On each tick:

```text
pending -> running -> succeeded/failed
```

Each execution writes a row in `cron_job_runs`.

## 4) How target execution works

A target is just a string label mapped to a handler function in code.

Visual:

```text
target in DB
  "system.print_message"
        |
        v
CRON_TARGET_REGISTRY[target]
        |
        v
handler(context) executes
```

Source file:

```text
src/domains/cron/services/executor.ts
```

Current target constant:

```ts
export const CRON_TARGETS = {
  SYSTEM_PRINT_MESSAGE: 'system.print_message',
} as const;
```

Current handler behavior:

1. Reads `payload.message`.
2. If message exists, prints it.
3. Otherwise prints fallback:
   - `[CRON] <jobKey>#<jobVersion> executed`

Snippet:

```ts
const systemPrintMessageHandler: CronTargetHandler = async context => {
  const payload = (context.payload || {}) as Record<string, unknown>;
  const rawMessage = payload['message'];
  const message =
    typeof rawMessage === 'string' && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : `[CRON] ${context.jobKey}#${context.jobVersion} executed`;

  Logger.info(`[CRON_TARGET:system.print_message] ${message}`, {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'cron-executor',
    operation: 'system_print_message',
  });
};
```

Registry mapping:

```ts
const CRON_TARGET_REGISTRY: Record<string, CronTargetHandler> = {
  [CRON_TARGETS.SYSTEM_PRINT_MESSAGE]: systemPrintMessageHandler,
};
```

## 5) Can we code anything for a target?

Yes. A target handler can run any logic you implement.

Examples:

1. Call external API.
2. Recompute scoreboard.
3. Sync matches.
4. Send internal events.

The cron system does not care about business meaning of target; it only routes target label to code handler and records run status.

## 6) How to add a new target

Use this checklist:

1. Add a new constant in `CRON_TARGETS`.
2. Implement handler function `(context) => Promise<void>`.
3. Register it in `CRON_TARGET_REGISTRY`.
4. Deploy API + scheduler.
5. Create a cron definition using this new target.
6. Validate run history in `/api/v2/admin/cron/runs` and scheduler logs.

## 7) Useful admin endpoints

1. `POST /api/v2/admin/cron/jobs`
2. `GET /api/v2/admin/cron/jobs`
3. `GET /api/v2/admin/cron/jobs/:jobId`
4. `PATCH /api/v2/admin/cron/jobs/:jobId/pause`
5. `PATCH /api/v2/admin/cron/jobs/:jobId/resume`
6. `POST /api/v2/admin/cron/jobs/:jobId/run-now`
7. `GET /api/v2/admin/cron/runs`
8. `GET /api/v2/admin/cron/runs/:runId`

## 8) Practical verification checklist

After creating your first recurring job:

1. Confirm job appears in jobs list.
2. Confirm scheduler logs show tick execution.
3. Confirm runs are written with terminal status (`succeeded`/`failed`).
4. Confirm target output appears (`system.print_message` console log).
