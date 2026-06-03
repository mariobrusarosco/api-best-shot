# Cloudflare Migration — Approach A: Lift-and-Shift to Cloudflare Containers

> **Status:** Scoping document. Not an approved implementation plan.
> **Companion docs:**
>
> - [Approach B — Workers API + Containers Scheduler](./cloudflare-migration-approach-b-workers-api-containers-scheduler.md)
> - [Approach C — Workers everywhere](./cloudflare-migration-approach-c-workers-everywhere.md)
> - [Approach D — Netlify alternative](./cloudflare-migration-approach-d-netlify-alternative.md)
> - [Open questions blocking approach selection](./cloudflare-migration-open-questions.md)

## TL;DR

Build two Docker images (one for the API runtime, one for the scheduler runtime) and deploy them as two **Cloudflare Containers** services. Keep Supabase as the database. Keep `node-cron`, Express, Playwright, `winston`, `@sentry/node` exactly as they are. Change essentially nothing in `src/`.

This is the **smallest** migration that gets us "off Railway, onto Cloudflare" while preserving the Supabase data tier.

## Compute mapping


| Runtime today                 | Source location                                                  | Target on Cloudflare                | Why                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Express HTTP API              | `src/apps/api/index.ts`                                          | Cloudflare Container (long-running) | Express depends on Node's `http.Server`; Containers run real Node, so no port required.                                                                            |
| Scheduler (cron + sweep loop) | `src/apps/scheduler/index.ts`, `src/apps/scheduler/recurring.ts` | Cloudflare Container (long-running) | The scheduler holds an in-memory `Map<string, ScheduledTask>` of `node-cron` handles and runs a `setInterval` sweep — fundamentally a long-lived stateful process. |
| Postgres                      | Supabase (managed)                                               | **Unchanged — Supabase**            | Per `docs/adr/003-database-reset-strategy.md`, the connection already goes through the Supabase Transaction Pooler.                                                |


## What changes vs. today

- **Hosting platform**: Railway → Cloudflare Containers.
- **CI/CD**: `.github/workflows/deploy-production.yml` and `deploy-demo.yml` swap their `@railway/cli` invocations for `wrangler` (Cloudflare CLI) container deploys.
- **Secrets**: move from Railway project secrets to Cloudflare secrets store.
- **Environment-driven IDs**: `buildRunnerInstanceId()` in `src/apps/scheduler/config.ts` reads `RAILWAY_SERVICE_NAME`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_SERVICE_ID`. These need a Cloudflare-equivalent (or generic) replacement so per-instance run IDs stay unique and traceable.
- **Logging shipping**: today logs go to stdout where Railway aggregates them. We need to confirm Cloudflare Containers log routing (Logpush or stdout aggregation) and adjust if necessary.
- **Image build**: a `Dockerfile` already exists at the repo root — verify it builds both runtimes (or split into two Dockerfiles / two stages, one per service).

## What stays the same

- All of `src/` — domain code, Drizzle schemas, Express middlewares, Sentry setup, Winston logger, Playwright integration, `node-cron` scheduler, AWS SDK calls.
- Supabase as the Postgres host.
- The dual-process model (API + scheduler) shown in the existing Railway dashboard.
- ADR-001 (Playwright in production) remains valid — Chromium continues to run inside the container image.

## Pros

- **Lowest engineering risk.** No code rewrite. The scheduler's stateful design (`recurringTaskRegistry`, `ONE_TIME_SWEEP_INTERVAL_MS` sweep, `deferInFlightRunsOnStartup` startup recovery) keeps working unchanged.
- **Reversible.** If Cloudflare Containers don't pan out cost- or quota-wise, rollback to Railway is a workflow swap, not a re-architecture.
- **Incremental.** Move the API container first, leave the scheduler on Railway until comfortable, then move the scheduler. The two services do not share runtime state — the scheduler talks to the API only via Postgres.
- **Unblocks Cloudflare Browser Rendering work** (the existing `tools/cloudflare-browser-rendering-api-probe/` POC) without forcing it: once on Cloudflare, both Playwright (in-container) and Browser Rendering (managed) are available side by side.

## Cons

- **None of the Workers upside.** No edge distribution, no near-zero cold starts, no Workers-tier pricing. We're running containers in Cloudflare's region(s), not at the edge.
- **Cloudflare Containers is the newest of the three CF compute primitives.** Pricing, quotas, and cold-start characteristics are less proven than Workers or even Railway.
- **Image weight.** Playwright + Chromium pushes the image to ~300 MB+ compressed. This affects deploy time and cold-start where applicable.
- **Two-platform maturity gap.** Some Railway niceties (per-PR ephemeral environments, deploy log UX, metrics dashboards) may be different on Cloudflare Containers.

## Risks & unknowns

- Cloudflare Containers regional availability and pricing model vs. our actual workload (API request volume, scheduler sweep frequency at `ONE_TIME_SWEEP_INTERVAL_MS = 15_000`).
- Egress costs from Cloudflare Containers → Supabase (depends on chosen region pairing).
- Image build pipeline: `Dockerfile` currently produces a generic build; we need to confirm it boots both `dist/src/apps/api/index.js` and `dist/src/apps/scheduler/index.js` (the two `serve:`* scripts in `package.json`).
- Health-check parity: the API exposes `/health` (`src/apps/api/index.ts:31`); we need an equivalent liveness signal for the scheduler container.

## Indicative effort (t-shirt sizing, not a commitment)


| Work item                                                 | Size           |
| --------------------------------------------------------- | -------------- |
| Dockerfile audit / split per runtime                      | S              |
| Wrangler / CF Containers config (two services, two envs)  | M              |
| GitHub Actions: replace Railway steps with Wrangler steps | M              |
| Secrets migration (Railway → CF)                          | S              |
| `buildRunnerInstanceId()` env var rename                  | S              |
| Smoke test on demo, cutover production                    | M              |
| **Total**                                                 | **~M overall** |


## When to pick this approach

Pick Approach A if **any** of these is true:

- We want to leave Railway **and** we are not willing to rewrite Express → Hono right now.
- We want to keep the scheduler design as-is (long-lived process, in-memory cron handles).
- We want a reversible step before deciding whether to invest in a Workers rewrite later.
- The "why Cloudflare?" answer is primarily *consolidation* (already using Browser Rendering / R2 / etc.) rather than *edge performance*.

## What this means for your decisions

The short version: **Approach A keeps the app exactly as it is.** No Express rewrite, no scheduler rewrite, no framework swap.

So if any of these is true for you, Approach A is the answer:

- **You don't want to rewrite Express to Hono.** Fine — Approach A keeps Express. (Approaches B and C would both require that rewrite.)
- **You want to keep the scheduler as a long-lived Node process** (with `node-cron`, the in-memory registry, the 15-second sweep — all of it). Approach A keeps the scheduler exactly as it is. (Approach B also keeps it. Approach C is the only one that rewrites it.)

Approach A is essentially "lift the same Docker image off Railway and onto Cloudflare Containers, then change CI/CD." The decision questions in the open-questions doc don't really gate this approach — they only gate the others. If you want minimum-change, this is it.

## Out of scope for this document

- Concrete Wrangler/Container manifests.
- A phased task breakdown — that comes only after an approach is selected and the open questions are answered.
- Cost modeling — needs CF Containers pricing applied to our actual traffic numbers.

