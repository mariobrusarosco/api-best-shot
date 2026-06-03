# Cloudflare Migration — Approach B: Workers API + Containers Scheduler

> **Status:** Scoping document. Not an approved implementation plan.
 > **Companion docs:**
> - [Approach A — Lift-and-shift to Containers](./cloudflare-migration-approach-a-containers.md)
> - [Approach C — Workers everywhere](./cloudflare-migration-approach-c-workers-everywhere.md)
> - [Approach D — Netlify alternative](./cloudflare-migration-approach-d-netlify-alternative.md)
> - [Open questions blocking approach selection](./cloudflare-migration-open-questions.md)

## TL;DR

Port the Express API to **Hono on Cloudflare Workers**. Keep the scheduler as a **Cloudflare Container** (or, transitionally, leave it on Railway). Keep Supabase as the database.

This is the **balanced** option: the API gets real Workers benefits (edge distribution, low cold start, native CF integrations), while the scheduler — which is fundamentally a long-lived stateful process — is not forced into a runtime that doesn't fit it.

## Compute mapping

| Runtime today | Source location | Target on Cloudflare | Why |
| --- | --- | --- | --- |
| Express HTTP API | `src/apps/api/index.ts`, `src/router/index.ts`, all `src/domains/*/api/*` and `src/domains/*/routes/*` | **Worker** (Hono) | Workers give edge + cost wins for stateless request/response code; Hono is the closest 1:1 mental model to Express. |
| Scheduler (cron + sweep loop) | `src/apps/scheduler/index.ts`, `src/apps/scheduler/recurring.ts`, `one-time.ts`, `startup-recovery.ts` | **Cloudflare Container** | Stateful, long-lived. Holds in-memory `Map<string, ScheduledTask>` of `node-cron` handles and a `setInterval` sweep. Workers cannot represent this without a rewrite (see Approach C). |
| Postgres | Supabase (managed) | **Unchanged — Supabase** | Connection via Supavisor pooler in transaction mode. The current code already sets `prepare: false` in `src/core/database/index.ts:40`, which is the right setting for that mode. |

## What changes vs. today

### API side (the heavy work)

- **Framework swap**: Express → Hono. The router structure in `src/router/index.ts` is already domain-versioned (`/v1/<domain>`, `/v2/<domain>`); Hono's `app.route()` maps onto that pattern directly.
- **Middleware swap**:
  - `cookie-parser` → Hono's cookie helper.
  - `cors` → Hono's CORS middleware (config in `src/apps/api/index.ts:82` carries over conceptually).
  - `requestLogger` (`src/middlewares/logger.ts`) → Hono middleware shape.
  - `accessControl` (`src/domains/shared/middlewares/access-control.ts`) → Hono middleware.
- **Per-handler signature change**: every handler under `src/domains/*/api/*` (e.g. `src/domains/tournament/api/index.ts`) takes `(req: Request, res: Response)` from Express today. On Hono they take `(c: Context)` — a structurally similar but distinct API. This is mechanical but touches every endpoint.
- **DB driver compatibility**: `postgres` (postgres-js) on Workers requires `nodejs_compat` flag and the `cloudflare:sockets` TCP API. Already conducive because of `prepare: false`. Verification needed against current Drizzle version (`drizzle-orm@^0.32.0`).
- **Logger swap**: `winston` (`src/core/logger`) is Node-specific. Replace with a Worker-friendly logger that preserves the existing `Logger.error(error, { domain, component, operation })` contract so call sites don't change.
- **Sentry swap**: `@sentry/node` + `@sentry/profiling-node` → `@sentry/cloudflare`. Initialization moves to the Worker entry; the existing tag taxonomy (`DOMAINS`, `COMPONENTS` from `src/core/logger/constants.ts`) can be reused.
- **Auth crypto**: `jsonwebtoken` works under `nodejs_compat` but `jose` is the Worker-native default. Decision deferred until JWT usage in `src/domains/auth/utils.ts` is reviewed.
- **Build pipeline**: `tsc + tsc-alias + ts-node-dev` is replaced for the API by **Wrangler** (esbuild-based bundling). The `@/*` path alias is preserved by Wrangler's TS support.
- **Sentry sourcemaps step**: today driven by `yarn sentry:sourcemaps` against `dist/`; needs to integrate with the Worker bundle output instead.
- **Playwright path**: any code path under the API that imports Playwright cannot run on Workers. Such code must either move to the scheduler container, be replaced with **Cloudflare Browser Rendering**, or be exposed to the Worker as a service binding to a Container worker. Audit needed.
- **Health endpoint**: `/health` (`src/apps/api/index.ts:31`) is trivial to replicate in Hono.

### Scheduler side (no change)

- Stays a Node container. Same `node-cron`, same `setInterval` sweep, same crash-recovery, same `recurringTaskRegistry`.
- Only platform plumbing changes: Dockerfile target, deploy workflow, secrets, and the `RAILWAY_*` env reads in `buildRunnerInstanceId()` (`src/apps/scheduler/config.ts:10`) become Cloudflare-equivalent.

### Cross-cutting

- **CI/CD** (`.github/workflows/deploy-*.yml`): API deploy step becomes `wrangler deploy`; scheduler deploy step becomes a CF Containers deploy. Database migration step (`yarn db:migrate` against `DB_STRING_CONNECTION_PRODUCTION`) is unchanged.
- **Secrets**: split into two stores — Workers secrets (for the API Worker) and CF Containers secrets (for the scheduler).

## What stays the same

- All domain logic in `src/domains/*/services`, `src/domains/*/queries`, `src/domains/*/schema`, `src/domains/*/typing`, `src/domains/*/error-handling`.
- Drizzle schema and migrations under `supabase/migrations/`.
- Supabase as the Postgres host.
- The two-runtime model (API + scheduler), just on different CF primitives.
- The scheduler's design.

## Pros

- **Best-fit per runtime.** Workers for stateless request/response work; Containers for stateful long-lived work. Each runtime is used where it shines.
- **Edge benefits for the API.** Lower latency for users globally, generous Workers free tier, native bindings to **Cloudflare Browser Rendering** (which the team is already prototyping in `tools/cloudflare-browser-rendering-api-probe/`).
- **Scheduler design is preserved.** None of the rewrite cost lands on the genuinely hard part of the system.
- **Forces a healthy audit** of Node-only dependencies in the API path — many of which (winston, @sentry/node, jsonwebtoken) have better serverless-era replacements anyway.
- **Compatible with the in-flight Browser Rendering work.** The POC and probe tool slot in naturally.

## Cons

- **The API rewrite is real.** Every endpoint under `src/domains/*/api/*` is touched, plus middlewares and the bootstrap in `src/apps/api/index.ts`. Mechanical, but broad.
- **Two operational platforms.** Workers ops (Wrangler, observability, KV/Queues if used) + Containers ops (image registry, Container deploys). Higher surface area than Approach A.
- **Bundle-size discipline.** Workers have hard bundle-size limits. We need to verify `@aws-sdk/client-s3`, `drizzle-orm`, etc. fit, or swap (e.g., to native R2).
- **JWT/cookie/CORS/error-mapping behavior must be re-verified** end-to-end after the framework swap. Subtle differences (e.g., cookie SameSite defaults, CORS preflight handling) are exactly where regressions hide.
- **`tsconfig-paths` runtime, `ts-node-dev` dev loop, and `tsc-alias` post-build** are replaced for the API by Wrangler tooling. Local DX changes.

## Risks & unknowns

- **Per-endpoint Node-only deps.** Inventory of which `src/domains/*/api/*` handlers transitively pull in Playwright, Sentry-Node, or other Node-only modules. Until this audit lands, the size of the rewrite is partially unknown.
- **Worker CPU time per request.** Some endpoints aggregate a lot (e.g., `getTournamentStandings` in `src/domains/tournament/api/index.ts:124`); if any blow past CPU budgets, they need pagination or caching.
- **Connection-pooler behavior under Worker concurrency.** Supabase Supavisor handles many short-lived clients well, but we need a basic load test before declaring it fine.
- **Sentry sourcemap pipeline rework.** Currently tied to `dist/`; Worker bundle output is different.
- **Two CI jobs to keep in sync.** Drift risk on env vars between the Worker and the Container.

## Indicative effort (t-shirt sizing, not a commitment)

| Work item | Size |
| --- | --- |
| Express → Hono port (router + middlewares + all handlers) | L |
| Logger and Sentry swaps (preserving the existing `Logger.error(...)` contract) | M |
| DB driver verification on Workers (Supavisor + `prepare: false`) | S–M |
| Playwright path audit and routing decision per call site | M |
| Wrangler config + bundle-size pass | M |
| CI/CD split (Worker deploy + Container deploy) | M |
| Scheduler Container path (same as Approach A) | M |
| Secrets migration | S |
| Smoke test on demo, cutover production | M |
| **Total** | **~L overall** |

## When to pick this approach

Pick Approach B if:
- We want most of the Cloudflare upside (edge API, native Browser Rendering / R2 / Queues, Workers pricing) **without** rewriting the part of the system (the scheduler) that genuinely doesn't fit a serverless model.
- We're willing to invest in an Express → Hono port for the API, but not in re-implementing the cron runtime.
- We want a clean, defensible end-state without taking the biggest rewrite all at once.

## Decision dependencies

This approach is viable when:
- Q1 (Express → Hono rewrite): answer is **Yes**.
- Q2 (scheduler re-architecture): answer is **Keep long-lived Node**.
- Q3 (Playwright → Browser Rendering timeline): the BR API replaces Playwright in any **API-path** call site before, or as part of, the API port. Playwright remaining inside the **scheduler** container is fine.
- Q4 (why Cloudflare): the answer includes edge performance and/or native CF integrations, not only "get off Railway".

See `cloudflare-migration-open-questions.md` for the full list.

## Out of scope for this document

- A handler-by-handler port checklist.
- Wrangler/Container manifests.
- The Approach C re-architecture of the scheduler (covered in its own doc).
- Cost modeling — needs Workers-paid + CF Containers pricing applied to current traffic numbers.
