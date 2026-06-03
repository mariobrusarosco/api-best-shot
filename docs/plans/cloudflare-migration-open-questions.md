# Cloudflare Migration — Open Questions Blocking Approach Selection

> **Status:** Scoping document. The answers to the four questions below determine which migration approach is viable. **No implementation plan should be written until these are answered.**
> **Companion docs:**
> - [Approach A — Lift-and-shift to Cloudflare Containers](./cloudflare-migration-approach-a-containers.md)
> - [Approach B — Workers API + Containers Scheduler](./cloudflare-migration-approach-b-workers-api-containers-scheduler.md)
> - [Approach C — Workers everywhere](./cloudflare-migration-approach-c-workers-everywhere.md)
> - [Approach D — Netlify alternative](./cloudflare-migration-approach-d-netlify-alternative.md) — non-Cloudflare alternative considered alongside A/B/C; carries one Netlify-specific question (Q5) documented inside that doc.

## How this doc is structured

Each question is presented with:
- The literal decision to be made.
- Why it is load-bearing (what it locks or unlocks).
- The implication for each approach.
- A small space at the bottom of each question to record the answer once made.

## Approach matrix (recap)

| | Platform | API runtime | Scheduler runtime | Code rewrite scope |
| --- | --- | --- | --- | --- |
| **A** | Cloudflare | Cloudflare Container (Express unchanged) | Cloudflare Container (`node-cron` unchanged) | Minimal |
| **B** | Cloudflare | Cloudflare Worker (Hono port) | Cloudflare Container (`node-cron` unchanged) | API rewrite |
| **C** | Cloudflare | Cloudflare Worker (Hono port) | Cloudflare Worker + Cron Triggers / Durable Objects | API rewrite + scheduler rewrite |
| **D1** | Netlify + secondary host | Netlify Function (Express via `serverless-http`) | **Off-platform** (Railway / Render / Fly / CF Containers) | API wrapping; scheduler unchanged |
| **D2** | Netlify | Netlify Function (Express via `serverless-http`) | Netlify Scheduled Functions + Background Functions | API wrapping + scheduler rewrite (≈ Approach C work, on a less-suitable platform) |
| **D3** | Netlify | — | — | **Not possible** — Netlify has no long-running process primitive |

---

## Q1 — Are we willing to rewrite the API from Express to Hono?

### What's actually being asked

Express is a Node-only HTTP framework that depends on Node's `http.Server`. Cloudflare Workers do not run Node's HTTP layer; their request/response model is built on Web-standard `fetch`, `Request`, `Response`. To run the API on Workers, we must port to a Workers-native framework. **Hono** is the closest 1:1 mental model to Express.

The port itself is mechanical but broad. It touches:
- `src/apps/api/index.ts` (bootstrap, middlewares, CORS, cookies)
- `src/router/index.ts` (versioned domain routing)
- Every handler under `src/domains/*/api/*` (e.g. `src/domains/tournament/api/index.ts`)
- Every middleware (`src/middlewares/logger.ts`, `src/domains/shared/middlewares/access-control.ts`)
- Build/dev tooling (Wrangler replaces `tsc + tsc-alias + ts-node-dev` for the API)

### Why it is load-bearing

If we are **not** willing to do this rewrite, Approaches B and C are off the table — the API can only run on **Cloudflare Containers**, which means **Approach A** is the only viable path.

### Implications by approach

- **No** → Only Approach A is viable.
- **Yes** → Approach B and Approach C become viable. (Q2 then decides which.)

### Answer (fill in once decided)

> _Decision:_
> _Decided by:_
> _Date:_
> _Notes:_

---

## Q2 — Do we want the scheduler to keep running as a long-lived Node process, or do we want to re-architect it serverless?

### What's actually being asked

Today's scheduler (`src/apps/scheduler/index.ts`, `src/apps/scheduler/recurring.ts`) is fundamentally a long-lived stateful process:

- It loads active recurring definitions from Postgres on startup (`loadActiveRecurringDefinitions`).
- It calls `cron.schedule(...)` and stores the resulting `ScheduledTask` handles in an in-process `Map<string, ScheduledTask>` (`recurringTaskRegistry`).
- It runs a `setInterval` sweep every `ONE_TIME_SWEEP_INTERVAL_MS = 15_000` ms (`src/apps/scheduler/config.ts:6`) that processes one-time definitions and reconciles the recurring registry against the DB.
- It performs crash-recovery on startup (`deferInFlightRunsOnStartup` in `src/apps/scheduler/startup-recovery.ts`).
- It owns per-instance runner identity via `buildRunnerInstanceId()` (`src/apps/scheduler/config.ts:10`), composed today from `RAILWAY_*` env vars and `process.pid`.

This design assumes a single, long-lived process with in-memory state. It maps cleanly onto a container, and **does not** map onto a Worker without being rewritten.

### Why it is load-bearing

- **Keep long-lived** → the scheduler stays a Node container regardless of where the API runs. That's Approach A or Approach B.
- **Re-architect serverless** → the scheduler becomes a Worker driven by Cron Triggers (Design C1) or by Durable Object alarms (Design C2). That's Approach C, and only Approach C.

The "re-architect" answer also implies non-trivial work that is not strictly a code translation:
- Replacing `node-cron`'s in-process scheduling with cron-expression parsing (e.g. `cron-parser`).
- Replacing the in-memory `recurringTaskRegistry` with either DO storage or DB-as-source-of-truth on every tick.
- Reproducing crash-recovery semantics (`deferInFlightRunsOnStartup`) under a model where there is no per-instance "ownership".
- Routing long-running execution (Playwright, large syncs) through Cloudflare Queues + (optionally) a Container worker, because Workers cannot run those jobs inline.

### Implications by approach

- **Keep long-lived Node** → Approach A or Approach B.
- **Re-architect serverless** → Approach C only.

### Answer (fill in once decided)

> _Decision:_
> _Decided by:_
> _Date:_
> _Notes:_

---

## Q3 — What is the timeline for replacing Playwright with Cloudflare Browser Rendering?

### What's actually being asked

Playwright cannot run on Cloudflare Workers — it requires a real Chromium binary. It can run on Cloudflare Containers (with a heavy image), and it can be replaced by **Cloudflare Browser Rendering**, the managed Puppeteer/Chromium service.

The team is already prototyping the Browser Rendering path:
- `tools/cloudflare-browser-rendering-api-probe/` — runnable probe.
- `docs/plans/cloudflare-browser-rendering-api-sofascore-poc.md` — POC document with explicit pass/fail criteria.
- `docs/plans/cloudflare-browser-run-sofascore-poc.md` — companion POC.
- `docs/adr/001-playwright-production-deployment.md` — current production decision for Playwright.

So the question is not *whether* this is happening, but *when*, and *which API call sites* will still depend on Playwright at the moment of the migration cutover.

### Why it is load-bearing

The location of any surviving Playwright call site determines what runtime can host it:

- **API path → Playwright still present** → that path **cannot** run on a Worker. Approach B or C must isolate the call to a Container worker called from the Worker, or the migration of those endpoints must wait for the BR replacement.
- **Scheduler path → Playwright still present** → fine in Approach A and Approach B (Container scheduler runs Chromium). In Approach C, that path must be moved behind a Container worker invoked from the cron tick / DO alarm.
- **Playwright fully replaced before migration cutover** → no Playwright constraints on the chosen approach. Approach C becomes meaningfully cheaper to operate.

### Implications by approach

- **Approach A:** unaffected — Containers can run Playwright today.
- **Approach B:** affected if Playwright is on the API path. The API can still move to Workers, but Playwright-touching endpoints are either (a) deferred until Browser Rendering replaces them, or (b) hopped to a Container worker via service binding.
- **Approach C:** affected if Playwright is on either path. Browser Rendering replacement is effectively a precondition (or is committed to as part of the migration).

### Answer (fill in once decided)

> _Current Playwright call-site inventory (API path vs scheduler path):_
> _Target date for Browser Rendering replacement:_
> _Decided by:_
> _Date:_
> _Notes:_

---

## Q4 — Why are we considering Cloudflare in the first place?

### What's actually being asked

Different motivations point to different approaches. The honest version of the trade-off is:

- *"Get off Railway"* → consolidation is the goal. Lowest engineering cost wins. The cheapest path is Approach A.
- *"Edge performance for the API and Cloudflare-native integrations (Browser Rendering, R2, Queues, KV)"* → Workers must host the API. Approach B is the minimum that delivers this; Approach C delivers it more fully.
- *"Strategic bet on Cloudflare-native architecture as a long-term direction"* → end-state matters more than time-to-cutover. Approach C is justified.
- *"Cost at our current scale"* → this is unanswered until pricing is modeled against actual traffic; the answer to Q4 should not be *"cost"* alone without that modeling.

### Why it is load-bearing

This is the question that turns the matrix into a single answer. Q1, Q2, Q3 gate which approaches are *viable*. Q4 picks among the viable ones.

### Implications by approach

- **"Off Railway"** → Approach A.
- **"Edge + native integrations"** → Approach B (default), or Approach C if also re-architecting the scheduler (Q2 = re-architect).
- **"Strategic Cloudflare-native bet"** → Approach C.
- **"Cost"** → answer pending pricing modeling. Cannot be used to pick an approach until that modeling exists.

### Answer (fill in once decided)

> _Primary motivation:_
> _Secondary motivations (if any):_
> _Decided by:_
> _Date:_
> _Notes:_

---

## How to use this document

1. Answer **Q1** — gates whether the API can move to Workers at all.
2. Answer **Q2** — gates whether the scheduler stays Node or becomes serverless.
3. Answer **Q3** — gates how Playwright-touching code paths migrate; affects Approach B and Approach C only.
4. Answer **Q4** — picks among the viable approaches.

Once all four are answered, exactly one of the three approach docs becomes the basis for an actual implementation plan (with Phases → Tasks → Subtasks per the project's planner-mode convention).

## What this document deliberately does **not** do

- It does not recommend an approach. The recommendation depends on the answers above.
- It does not contain code, manifests, or task breakdowns. Those come **after** an approach is selected.
- It does not estimate timelines in calendar weeks. The approach docs use t-shirt sizing only; calendar estimates require a chosen approach and a real scoping pass.
