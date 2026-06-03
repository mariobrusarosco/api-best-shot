# Migration — Approach D: Netlify (alternative to the Cloudflare approaches)

> **Status:** Scoping document. Not an approved implementation plan.
> **Note on naming:** This doc shares the `cloudflare-migration-` filename prefix with its siblings only because they were authored as a single approach series. Approach D is **not** a Cloudflare migration — it evaluates Netlify as the platform target instead.
> **Companion docs:**
> - [Approach A — Lift-and-shift to Cloudflare Containers](./cloudflare-migration-approach-a-containers.md)
> - [Approach B — Workers API + Containers Scheduler](./cloudflare-migration-approach-b-workers-api-containers-scheduler.md)
> - [Approach C — Workers everywhere](./cloudflare-migration-approach-c-workers-everywhere.md)
> - [Open questions blocking approach selection](./cloudflare-migration-open-questions.md)

## TL;DR — the headline finding, up front

**Netlify is not a viable lift-and-shift target for the current architecture.** Netlify does not offer a long-running container or process primitive. The scheduler runtime (`src/apps/scheduler/index.ts`) — which is a long-lived Node process holding an in-memory `Map<string, ScheduledTask>` of `node-cron` handles and running a 15-second `setInterval` sweep — **cannot run on Netlify in any form**. The Express API can run, but only by being reshaped into Lambda-style serverless functions, with hard timeouts and known runtime caveats.

So the literal answer to "could we deploy the way we are right now, but on Netlify?" is **no, not as a lift-and-shift**. To make Netlify work at all, one of the two runtimes must move off-platform, **or** we take on a rewrite at least as large as Approach C — on a platform less suited to it than Cloudflare.

## Why this is structurally different from Approaches A/B/C

The Cloudflare approach set works because Cloudflare offers **three** compute primitives (Workers, Workers + Durable Objects, Containers), and one of them — Containers — is an actual long-running Node host. That's why Approach A exists at all: it's a true lift-and-shift.

Netlify offers no equivalent. Netlify's compute primitives are all **serverless functions**, in different shapes:

| Netlify primitive | Runtime | Long-running? | Persistent in-mem state? | Time limit | Notes |
| --- | --- | --- | --- | --- | --- |
| Functions (synchronous) | Node (Lambda) | No | No | 10s free / **26s paid** | Standard request/response |
| Background Functions | Node (Lambda) | No (fire-and-forget) | No | 15 min | Returns `202` immediately; not usable for user-facing API responses |
| Scheduled Functions | Node (Lambda) | No | No | 60s | Cron-triggered; **min granularity 1 min** |
| Edge Functions | Deno (V8 isolates) | No | No | 50ms CPU / 40s headers | Not Node — different ecosystem; not Express-compatible |
| Async Workloads (extension) | Node | Durable event-driven, not "long-running" | No | (per workload) | Newer extension; less proven than CF or AWS equivalents |

Sources: Netlify docs ([Background Functions](https://docs.netlify.com/build/functions/background-functions), [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions), [Async Workloads](https://docs.netlify.com/build/async-workloads/get-started), [Express on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/)) — verified 2026-05.

There is **no row in this table that is a long-running Node process**. That is the whole structural problem.

## What "the way we are right now" actually requires

Re-stating, because it's the load-bearing fact:

1. **API**: an Express process bound to a port (`src/apps/api/index.ts:98` — `app.listen(port, '0.0.0.0', ...)`). Express depends on Node's `http.Server`. Each request is handled by middleware chains, with cookies, CORS, JWT, and per-domain handlers under `src/domains/*/api/*`.
2. **Scheduler**: a Node process that:
   - Loads cron definitions from Postgres on startup (`loadActiveRecurringDefinitions` in `src/apps/scheduler/recurring.ts:73`).
   - Holds an in-memory `recurringTaskRegistry: Map<string, ScheduledTask>` of `node-cron` handles.
   - Runs a `setInterval(..., ONE_TIME_SWEEP_INTERVAL_MS = 15_000)` sweep (`src/apps/scheduler/config.ts:6`, `src/apps/scheduler/index.ts:63`) that processes one-time runs and reconciles the recurring registry against the DB.
   - Performs crash-recovery on startup (`deferInFlightRunsOnStartup` in `src/apps/scheduler/startup-recovery.ts`).

Netlify can host **half** of (1) — the request/response part — only by reshaping it into Lambda invocations. Netlify can host **none** of (2). Full stop.

## The three sub-options on Netlify (none are pure lift-and-shift)

### D1 — API on Netlify Functions, scheduler off-platform

The API is wrapped with `serverless-http` and deployed as a Netlify Function. The scheduler runtime stays on Railway, Render, Fly.io, Cloudflare Containers, or any other long-running-process host.

**What changes vs. today (API):**
- New entry point: a Netlify Function that wraps the existing Express `app` via `serverless-http` (the path documented at [Express on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/)).
- `netlify.toml` with redirects to route every incoming request to the wrapping function.
- Build pipeline integrates with Netlify's build step.
- All Express middleware (cookie-parser, cors, requestLogger, accessControl) keeps working unmodified, because they run inside the Lambda Node runtime.
- Sentry-Node and Winston keep working, with cold-start cost on every cold invocation.
- DB driver: `postgres` (postgres-js) keeps working, but **must use Supabase Supavisor (transaction pooler)** because each Lambda invocation is a fresh connection — no in-process pool.

**Pros:**
- Smallest path to "API on Netlify".
- Scheduler design entirely unchanged.
- No framework rewrite for the API.

**Cons:**
- Hard request timeout: **10s on free, 26s on paid plans**. We must verify no current API endpoint approaches that ceiling under load (the heavier domain endpoints in `src/domains/tournament/api/index.ts`, `src/domains/tournament-round/api/index.ts`, and the dashboard domain are the candidates to profile).
- **Known runtime issue**: `serverless-http` on Netlify has a documented incompatibility with Netlify's Web-platform `Request` objects (GitHub issue [netlify/cli#7305](https://github.com/netlify/cli/issues/7305), opened May 2025, closed Feb 2026). Status of the fix on the version we'd actually deploy must be verified before committing.
- Cold starts on every previously-idle path. Latency profile changes.
- **Two hosting providers** (Netlify + wherever the scheduler lives). Defeats most of the consolidation argument.
- No persistent in-memory state — anything that today relies on cached state inside the Express process must move to Redis or Postgres.

**Net assessment:** This is the only "Netlify with manageable rewrite" option, and even it isn't really a lift-and-shift — it requires Lambda-shaped operational thinking and timeout audits. And it does not deliver "everything on Netlify".

### D2 — Full migration: API on Functions, scheduler rewritten as Scheduled Functions + Background Functions

The API moves as in D1. The scheduler is rewritten using Netlify primitives:
- A **Scheduled Function** on `* * * * *` (the minimum granularity Netlify supports) drives the equivalent of today's sweep loop. It reads active definitions from Postgres, decides which are due, and dispatches.
- **Background Functions** (max 15 min) execute the actual scheduled work for jobs that exceed the 60-second sync limit.
- Crash-recovery logic (`deferInFlightRunsOnStartup`) becomes a no-op-or-rewritten — there is no in-process state to recover.

**What this is, conceptually:** the same scheduler rewrite as **Approach C**, but using Netlify primitives instead of Cloudflare's. The mental model is identical: cron-tick driven, DB-backed state, fan-out to long-running execution.

**Pros:**
- Everything on Netlify (single platform).
- Forces cron state of record to fully live in Postgres — same architectural improvement Approach C delivers.

**Cons (this is where Approach D2 is dominated by C):**
- **Same rewrite cost** as Approach C. We pay the most expensive option's price tag.
- **15-minute Background Function ceiling** is a hard limit. Any single scheduled run that takes longer than 15 minutes (some Playwright + SofaScore syncs may approach this under contention) must be chunked or moved off-platform — at which point we're back to D1's two-provider story.
- **No native primitives** equivalent to Cloudflare Durable Objects (for per-definition ownership), Queues (for fan-out), or Browser Rendering (for replacing Playwright). The Async Workloads extension partially covers durable workloads but is less mature.
- **Playwright on Netlify Functions is operationally painful.** Lambda layer/function size limits are tight; the patterns that work (chrome-aws-lambda, sparticuz/chromium) are workable but well-known sources of drift.
- **Cron granularity is 1 minute minimum.** Today's sweep is 15 seconds. Reducing one-time-run latency to ≤15s is impossible on Netlify Scheduled Functions.

**Net assessment:** This delivers the "fully on Netlify" outcome, but at the cost of doing Approach C's work on a platform that's a worse fit for it. If we're willing to do Approach C, we should do it on Cloudflare.

### D3 — True lift-and-shift, all-Netlify, zero rewrite

**Not possible.** Documented for completeness so future readers know it was considered.

## Pros (of even considering Netlify)

- **Existing consolidation.** If Netlify is already used elsewhere (typically for a Jamstack frontend), there's an organizational argument for keeping the API there.
- **Free-tier economics.** Netlify Functions free tier is generous for low-traffic APIs.
- **Edge Functions** could be useful for cacheable read-only routes — but they're Deno, not Node, so they're a separate concern from this migration.

## Cons

- **Fundamental compute model mismatch** for the scheduler runtime — no Netlify primitive maps to "long-lived Node process".
- **Hard request timeouts** on the API path that don't exist on Railway / Cloudflare Containers / any other Node host.
- **Playwright** doesn't fit cleanly into Netlify Functions.
- **Cron minimum granularity (1 min)** vs. today's 15-second sweep cadence — D2 introduces latency we don't have today.
- **Lock-in to Lambda-shaped request/response.** Reversing a Netlify Functions deployment back to a "real Node app" requires unwinding the `serverless-http` adapter and the per-function deployment shape.

## Risks & unknowns

- **`serverless-http` runtime issue verification.** Even though [netlify/cli#7305](https://github.com/netlify/cli/issues/7305) is marked closed, we'd need to verify the fix is live on whichever runtime version we'd deploy against, and run a smoke test of cookies + CORS + JWT through the adapter.
- **Endpoint timeout audit.** No current API endpoint may exceed 26s today, but some aggregation paths (dashboard, tournament standings, knockout rounds) are candidates. Profiling is required before committing to D1.
- **Async Workloads cost and fit.** Newer extension, less proven than the comparable Cloudflare/AWS equivalents.
- **Connection pool sizing under Lambda concurrency.** Supabase Supavisor in transaction mode handles many short-lived clients well, but a basic load test is required (same as in Approach B/C).
- **Background Function retries.** Netlify retries failed Background Functions after 1 minute, then 2 minutes. Today's `CRON_RUN_SERVICE.queueScheduledRun` already returns `{ outcome: 'pending' | 'skipped' | 'duplicate' | 'error' }` (`src/apps/scheduler/recurring.ts:23`), so the idempotency contract is in good shape — but we'd need to verify behavior under Netlify's specific retry semantics.

## Indicative effort (t-shirt sizing, not a commitment)

| Sub-option | API work | Scheduler work | Other | Total |
| --- | --- | --- | --- | --- |
| **D1** (API on Netlify, scheduler elsewhere) | M (serverless-http wrapping, netlify.toml, cold-start audit, timeout audit, secrets) | None on Netlify side; whatever is needed to put the scheduler on the chosen secondary host | M (CI/CD across two platforms) | **~M overall** |
| **D2** (full Netlify) | M (same as D1) | L (cron-tick rewrite, Background-Function execution path, Playwright workaround, 1-min granularity reconciliation) | M (CI/CD, secrets, observability) | **~L overall — comparable to Approach C** |
| **D3** (lift-and-shift) | — | — | — | **Not possible** |

## When to pick this approach

Pick Approach D (any sub-option) **only if** at least one of these is true:
- Netlify is **already mandated** by another part of the organization (e.g. a Netlify-hosted frontend the team is consolidating around).
- We are **explicitly willing** to permanently host the scheduler somewhere other than Netlify (D1).
- We are willing to take on Approach C-sized rewrite work on a platform less suited to it than Cloudflare (D2).

If the motivation is just "off Railway" or "consolidation", **Approach A on Cloudflare Containers is strictly better** — Cloudflare actually has a long-running container primitive, while Netlify does not. This is the single most important comparison in this document.

## Decision dependencies

This approach is gated by the same four open questions as A/B/C, plus one Netlify-specific addition:

- **Q1 (Express → Hono):** *Does not gate D.* Netlify Functions accept Express via `serverless-http`; no framework rewrite is required to land on Netlify. The framework decision is decoupled from the platform decision in this approach.
- **Q2 (scheduler re-architecture):**
  - "Keep long-lived Node" → only **D1** is viable (scheduler stays elsewhere).
  - "Re-architect serverless" → **D2** is on the table, but at higher cost and worse fit than Approach C.
- **Q3 (Playwright timeline):** Strongly affects **D2**. Playwright on Netlify Functions is operationally painful; Browser Rendering replacement should be a precondition for D2.
- **Q4 (why Cloudflare?):** This question reframes for D as "why Netlify rather than something else?" — and importantly: "off Railway" alone is not a sufficient justification for D, because Approach A on Cloudflare Containers is a strictly better answer to that motivation.
- **Q5 (Netlify-specific) — new:** *What is the Netlify-specific reason for choosing Netlify over Cloudflare Containers?* If there is no answer, Approach D is dominated by Approach A and should be discarded.

See `cloudflare-migration-open-questions.md` for the full list (Q1–Q4); Q5 is documented here because it is specific to this approach.

## Out of scope for this document

- Concrete `netlify.toml` configuration.
- Phased task breakdown (only relevant after an approach is selected).
- Cost modeling — needs Netlify Functions / Background Functions pricing applied to current traffic numbers and scheduler tick volume.
- Comparison to other "non-Cloudflare" platforms (Render, Fly.io, AWS App Runner, etc.). Out of scope unless explicitly requested.
