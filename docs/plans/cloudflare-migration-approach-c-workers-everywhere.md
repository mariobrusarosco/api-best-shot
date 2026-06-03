# Cloudflare Migration — Approach C: Workers Everywhere (API + Serverless Scheduler)

> **Status:** Scoping document. Not an approved implementation plan.
 > **Companion docs:**
> - [Approach A — Lift-and-shift to Containers](./cloudflare-migration-approach-a-containers.md)
> - [Approach B — Workers API + Containers Scheduler](./cloudflare-migration-approach-b-workers-api-containers-scheduler.md)
> - [Approach D — Netlify alternative](./cloudflare-migration-approach-d-netlify-alternative.md)
> - [Open questions blocking approach selection](./cloudflare-migration-open-questions.md)

## TL;DR

Port the Express API to **Hono on Workers** (same API work as Approach B) **and** re-architect the scheduler so it runs as a serverless Cloudflare construct: either a single Worker with a **Cron Trigger** that drives the existing DB-backed sweep loop, or **Durable Object alarms** per cron definition. Keep Supabase as the database.

This is the **strategic** option — biggest rewrite, but the cleanest end-state and the lowest steady-state ops cost. It is also the only approach that fully eliminates long-running container processes.

## Compute mapping

| Runtime today | Source location | Target on Cloudflare | Why |
| --- | --- | --- | --- |
| Express HTTP API | `src/apps/api/index.ts`, `src/router/index.ts`, all `src/domains/*/api/*` and `src/domains/*/routes/*` | **Worker** (Hono) | Same as Approach B. |
| Scheduler — recurring + one-time runs | `src/apps/scheduler/index.ts`, `recurring.ts`, `one-time.ts`, `startup-recovery.ts` | **Worker + Cron Triggers + Queues**, **or** **Worker + Durable Objects + DO Alarms** | The scheduler must be re-expressed because Workers have no long-lived process and no in-memory `Map<string, ScheduledTask>`. State of record moves fully to Postgres (already mostly true) and/or Durable Object storage. |
| Long-running side-effects (e.g. Playwright scraping, large SofaScore syncs) | `src/domains/data-provider*` | **Cloudflare Browser Rendering** for browser work, **Cloudflare Queues** for fan-out, optionally **a Container worker** invoked from the Worker for any task that exceeds Workers' CPU/wall budgets | Some current scheduler-triggered work will exceed Worker time limits. |
| Postgres | Supabase (managed) | **Unchanged — Supabase** | Same as the other approaches. |

## What changes vs. today

### API side

Identical to Approach B's API work. Refer to `cloudflare-migration-approach-b-workers-api-containers-scheduler.md` → "What changes vs. today → API side" for the full list. Summary:

- Express → Hono.
- Middlewares re-shaped (CORS, cookies, request logger, access control).
- Logger and Sentry swapped to Worker-compatible variants while preserving call-site contracts.
- DB driver verified against Workers + Supavisor.
- Build pipeline moves to Wrangler.
- Playwright call sites re-routed (Browser Rendering, Queues, or Container worker).

### Scheduler side (the genuinely new work)

Two viable serverless designs, with very different complexity:

#### Design C1 — "Single Cron Trigger ticker Worker"

A single Worker with a `* * * * *` Cron Trigger. On every minute it:

1. Reads active **recurring** definitions from Postgres (mirrors today's `loadActiveRecurringDefinitions` in `src/apps/scheduler/recurring.ts:73`).
2. For each, decides whether the current minute matches the cron expression (using a parser like `cron-parser`).
3. Calls the equivalent of today's `executeRecurringDefinitionTick` (`src/apps/scheduler/recurring.ts:17`) — but the **execution** itself is dispatched to a Cloudflare Queue consumer Worker so the ticker stays under Worker CPU budgets.
4. Also processes due **one-time** definitions, mirroring `processDueOneTimeDefinitions` (today called from the `setInterval` in `src/apps/scheduler/index.ts:63`).
5. Performs the equivalent of `syncRecurringDefinitions` reconciliation — but here it's effectively free, because there is no in-memory `recurringTaskRegistry` to keep in sync; the Postgres definitions table **is** the source of truth on every tick.

This design is conceptually a port of today's `setInterval` sweep loop into a Cron Trigger handler. The hardest piece is the cron-expression matching (replacing `node-cron`'s in-process scheduling). Crash-recovery (today's `deferInFlightRunsOnStartup` in `src/apps/scheduler/startup-recovery.ts`) becomes simpler because there is no "in-flight on a specific instance" — only "in-flight in the DB", which can be reconciled on every tick.

#### Design C2 — "Durable Object per cron definition"

Each active recurring definition is owned by a **Durable Object** instance. Each DO:

- Persists its definition snapshot in DO storage.
- Computes the next-occurrence time (via `cron-parser`) and sets a DO `alarm()`.
- On `alarm()`: dispatches the run (via Queue, or directly if it fits in Worker CPU budget), then sets the next alarm.

A small management Worker (or HTTP endpoint inside the API Worker) creates/updates/destroys DOs in response to the Postgres `T_CronJobDefinition` table changes — which today is what `syncRecurringDefinitions` (`src/apps/scheduler/recurring.ts:205`) does in-process.

#### Common to both designs

- **One-time definitions** (`one-time.ts`) become a small Cron-triggered or Queue-triggered handler.
- **Long-running execution** (anything that Playwright or heavy SofaScore sync does today) cannot run inside the cron tick handler — it must be enqueued to a Queue consumer. The consumer is either:
  - Another Worker (if it fits under Workers CPU/wall limits), or
  - A **Container worker** (Cloudflare Containers as a callable backend for jobs that exceed Workers' budget).
- **Crash recovery** simplifies because state of record fully lives in Postgres + DO storage. There is no `RAILWAY_SERVICE_ID:pid` runner identity (today's `buildRunnerInstanceId()` in `src/apps/scheduler/config.ts:10`) — runner identity becomes the DO ID or the Worker invocation ID.

## What stays the same

- All domain logic in `src/domains/*/services`, `src/domains/*/queries`, `src/domains/*/schema`, `src/domains/*/typing`, `src/domains/*/error-handling`.
- Drizzle schema and migrations under `supabase/migrations/` (the cron domain schema in `src/domains/cron/schema` likely needs review, not replacement).
- Supabase as the Postgres host.
- The cron *definition* model — what runs, how often, with what payload — remains DB-driven. This is consistent with how the system works today; it's the *executor* that changes, not the model.

## Pros

- **Single runtime model.** No containers (unless explicitly used as a job-execution backend for time-bounded heavy work). Lower steady-state ops cost than Approach B.
- **Best architectural fit for global, low-latency, fully-managed.** Edge API + edge scheduler.
- **Forces the cron model to be DB-of-record-driven** end to end. Today's in-memory `recurringTaskRegistry` is implicitly a synchronization concern (which is why `deferInFlightRunsOnStartup` exists). Removing it removes a class of bugs.
- **Native fit for Cloudflare Queues, Browser Rendering, R2, KV** — the things you're plausibly migrating *for*.
- **Clearest answer for horizontal scaling.** No "two scheduler replicas double-fire" concerns; DO ensures single-instance ownership of each definition (in C2), or the cron-tick handler is naturally idempotent against the DB (in C1, with the same `queueScheduledRun` outcome semantics as today: `pending | skipped | duplicate | error` — see `src/apps/scheduler/recurring.ts:23`).

## Cons

- **Largest rewrite of the three approaches.** API rewrite (= Approach B) **plus** scheduler rewrite.
- **`node-cron` is replaced by something we own.** Cron expression parsing, DST handling, timezone semantics (today: `definition.timezone || 'UTC'` in `src/apps/scheduler/recurring.ts:117`) need to keep working with `cron-parser` (or equivalent). Subtle bugs are easy here.
- **Long-running jobs become a fan-out concern.** Today, a long Playwright run "just runs" inside the scheduler process. On Workers, anything that exceeds CPU/wall must hop to a Queue + a Container worker. More moving parts at runtime.
- **Crash-recovery semantics change.** Today's `deferInFlightRunsOnStartup` exists because a single scheduler restart can leave runs in `running` state without a live owner. The new design must produce equivalent guarantees with a different model (DO ownership, or DB heartbeat + sweep).
- **Operational visibility is more diffuse.** A single Railway log stream becomes: ticker Worker logs + queue consumer logs + DO logs (+ optional Container logs). Logpush, structured fields, and the existing `Logger` tag taxonomy (`{ domain, component, operation }`) become more important, not less.
- **DO pricing model.** Per-DO storage and request costs need to be modeled before declaring this cheaper at scale.

## Risks & unknowns

- **Cron-expression compatibility.** Validate that all definitions in `T_CronJobDefinition` parse identically under `cron-parser` (or whatever replacement) as they do under `node-cron` today, including timezones.
- **Worker CPU budgets** for the heaviest existing jobs. Until measured, we don't know which scheduler-triggered jobs require the Container-fallback path.
- **Idempotency contract** of `CRON_RUN_SERVICE.queueScheduledRun` (`src/apps/scheduler/recurring.ts:23`) under at-least-once delivery from Cloudflare Queues. Today the function returns `{ outcome: 'pending' | 'skipped' | 'duplicate' | 'error' }` — this is exactly the right shape for at-least-once, but needs explicit verification under Worker concurrency.
- **DO churn** if cron definitions are created/destroyed often (probably not the case here, but worth confirming).
- **Observability migration** (Sentry, Logpush, custom dashboards) is non-trivial.

## Indicative effort (t-shirt sizing, not a commitment)

| Work item | Size |
| --- | --- |
| Everything in Approach B's API column | L |
| Scheduler design choice (C1 vs C2) and decision doc | S |
| Cron-expression parser swap + timezone parity tests | M |
| Cron Trigger Worker (or DO + alarms) implementation | L |
| Queue + consumer Worker for execution dispatch | M |
| Container-worker fallback for jobs that exceed Worker budgets (optional, only where measured) | M |
| Crash-recovery semantics rewrite (DO ownership or DB heartbeat) | M |
| Observability migration (Sentry, Logpush, dashboards) | M |
| Decommission of `RAILWAY_*` env reads in `buildRunnerInstanceId()` | S |
| Smoke test on demo, cutover production, parallel-run period | L |
| **Total** | **~XL overall** |

## When to pick this approach

Pick Approach C only if:
- We are explicitly making a **strategic bet on Cloudflare-native architecture** as a long-term direction.
- We are willing to invest in re-implementing the scheduler runtime (cron parsing, alarm/tick dispatch, crash recovery) in a Worker/DO model.
- We're OK with a multi-month migration timeline relative to Approach A or B.
- The "why Cloudflare?" answer is dominated by *edge performance + cost at scale + deep native integration with Queues / Browser Rendering / R2*, not by *consolidation off Railway*.

## Decision dependencies

This approach is viable when:
- Q1 (Express → Hono rewrite): answer is **Yes**.
- Q2 (scheduler re-architecture): answer is **Re-architect serverless**.
- Q3 (Playwright → Browser Rendering timeline): the Browser Rendering replacement is committed, since no Worker (cron tick or otherwise) can run Playwright. Any Playwright path that survives must be moved behind a Container worker.
- Q4 (why Cloudflare): answer is *strategic Cloudflare-native bet*, not just *off Railway*.

See `cloudflare-migration-open-questions.md` for the full list.

## Out of scope for this document

- Choosing between design **C1 (Cron Trigger ticker)** and **C2 (Durable Object per definition)** — that decision deserves its own scoping doc once Approach C is selected.
- Wrangler/DO/Queue manifests.
- Cost modeling — needs Workers-paid + DO + Queues + (optional) CF Containers pricing applied to current scheduler tick volume and run sizes.
