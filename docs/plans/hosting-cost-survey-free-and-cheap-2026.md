# Hosting Cost Survey — Free and Cheapest Options for This Node App (2026)

> **Status:** Research / decision-input document. Not a plan.
> **Date of pricing data:** 2026-05.
> **Why this is dated:** Hosting tiers change frequently (Render, Fly.io, Railway, Heroku have all materially changed their free tiers in the last 18 months). Re-verify before committing to any number here.
> **Companion docs:** This doc supplies pricing context for the migration approach docs:
> - [Approach A — Cloudflare Containers](./cloudflare-migration-approach-a-containers.md)
> - [Approach B — Workers + Containers](./cloudflare-migration-approach-b-workers-api-containers-scheduler.md)
> - [Approach C — Workers everywhere](./cloudflare-migration-approach-c-workers-everywhere.md)
> - [Approach D — Netlify alternative](./cloudflare-migration-approach-d-netlify-alternative.md)
> - [Open questions](./cloudflare-migration-open-questions.md)

---

## TL;DR

For **this specific app** — two long-running Node processes (`src/apps/api` + `src/apps/scheduler`) where the scheduler today ships with Playwright/Chromium — the realistic options sort into three tiers:

| Tier | Best option | Cost | Trade-off |
| --- | --- | --- | --- |
| **Truly $0/mo** | **Oracle Cloud Always Free** (4 ARM OCPUs, 24 GB RAM) | $0 perpetual | You operate the VM yourself (Linux, Docker, systemd, TLS, monitoring). |
| **~$4/mo, self-managed** | **Hetzner CAX11** (4 GB RAM ARM, 20 TB egress) | €3.79/mo | Same self-managed model as Oracle, but no capacity-availability roulette and outside Oracle's ecosystem. |
| **~$5/mo, managed PaaS** | **Cloudflare Containers** (via $5 Workers Paid) **or** the **current Railway Hobby** ($5 + usage) | $5/mo + overage | Zero ops; pay for the convenience. |

**The "truly free 24/7" answer is Oracle Cloud Always Free** — it's the only free tier in 2026 that can host both runtimes including Playwright without sleeping on idle, and the resource ceiling (4 ARM cores + 24 GB RAM) is dramatically larger than anything else in the free-tier market. Everything else free either sleeps, doesn't run long-lived workers, or can't fit Chromium.

If self-managed VM ops is unacceptable, the floor jumps to **~$5/mo on a managed PaaS** — at which point the question becomes which one, not whether it's free.

---

## App-specific constraints (this is what gates everything below)

Re-stating the constraints because they decide which options are even applicable:

1. **Two long-running Node processes** that must stay up 24/7:
   - API: `src/apps/api/index.ts` — Express on port 9090.
   - Scheduler: `src/apps/scheduler/index.ts` — `node-cron` registry + 15-second sweep loop. Has crash-recovery (`deferInFlightRunsOnStartup`) that depends on the process owning state across runs.
2. **Playwright** is currently a hard dependency on the scheduler/data-provider path (per `docs/adr/001-playwright-production-deployment.md`). Chromium needs **~1 GB+ RAM minimum** to run reliably and adds **~300 MB+** to the container image. This single fact disqualifies most ultra-cheap tiers.
3. **Postgres is external** (Supabase). No DB hosting cost in this survey — Supabase is the data tier regardless of where the app runs.
4. **Standard Node deps**: `@sentry/node`, `winston`, `@aws-sdk/client-s3`. Fine on any Node host.
5. **In-flight POC** to replace Playwright with Cloudflare Browser Rendering (`tools/cloudflare-browser-rendering-api-probe/` + `docs/plans/cloudflare-browser-rendering-api-sofascore-poc.md`). **If Playwright disappears**, the RAM floor drops dramatically — many ultra-cheap options open up that are closed today.

The survey below is honest about which options work *with* Playwright and which only work *without* it.

---

## How "free" hosting actually works in 2026 (myth vs reality)

Three things to disambiguate, because most "free Node hosting" lists conflate them:

1. **Free tier vs free trial credit.** A free *tier* is permanent. A free *trial* is a one-time credit (e.g. Railway's $5 starter, AWS Lightsail's 3 free months, Fly.io historical $5 credit). Trial credits are not a sustainable plan.
2. **Always-on vs sleeps-on-idle.** Many "free" platforms (Render free web services, older Heroku free dynos, Vercel hobby for backends) **spin down after a period of inactivity**. For an API this means cold starts. For the scheduler, idle-sleep means **the process literally stops being alive**, which breaks `node-cron` entirely. Sleeps-on-idle is not viable for the scheduler.
3. **Worker support on free.** Many platforms support free *web services* but not free *background workers*. Render is the textbook example: free web tier exists but **does not include background workers** at the free tier. Our scheduler is a background worker.

A free tier is only useful for this app if it **(a) doesn't sleep, (b) supports background workers, (c) gives us at least 1 GB RAM** for the Playwright path.

---

## True free-tier options (analysed against this app's needs)

### 1. Oracle Cloud Infrastructure — Always Free Tier ✅ usable

- **Up to 4 ARM Ampere A1 OCPUs + 24 GB RAM total** (split however across instances).
- **200 GB block storage**, **10 TB outbound transfer/month**.
- **Always-on, perpetual.** Not a trial. ([source](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm))
- Docker installs and runs. Node 22 + Playwright + the existing Dockerfile is a reasonable fit.

**Caveats (real, worth flagging):**
- **Capacity shortages.** Popular regions are reportedly hard to provision ARM instances in. Plan for retry-until-it-works on first creation.
- **Home region locked.** You pick one region for free-tier eligibility and cannot change it.
- **Account-deletion cliff.** If you ever exceed 4 OCPUs / 24 GB Ampere capacity total, **all instances are disabled and deleted after 30 days** unless you upgrade to paid. This is a real cost discipline concern.
- **Self-managed.** You operate Linux, Docker, systemd, TLS termination, certificate renewal, monitoring, log shipping, OS updates. None of this is hard, but it's also not zero.

**Verdict:** This is the most practical "actually free" option in 2026 for this app. It's the only one that fits Playwright + two long-lived processes + always-on at $0.

### 2. Koyeb Free Tier ⚠️ usable, tight specs

- **One free instance**, always-on, no credit card required. Pay-per-second beyond.
- **100 GB outbound/month** included.
- The free instance specs are *small* (likely the nano tier — public docs are evasive about exact RAM on the free Eco instance). Almost certainly **not enough** for Playwright. ([source](https://www.koyeb.com/docs/faqs/pricing))

**Verdict:** Plausible for the **API only** (lightweight Express handlers) if Playwright moves elsewhere. Not viable for the scheduler-with-Playwright today.

### 3. Northflank Developer Sandbox ⚠️ limited

- **2 services + 2 jobs + 1 addon**, free.
- Jobs can be scheduled (cron). Services can be background workers.
- Specs on the free tier are tight; Playwright fit is unverified. ([source](https://northflank.com/changelog/free-developer-projects))

**Verdict:** Worth verifying if you want a managed free option. Could potentially host both runtimes if specs allow; needs hands-on confirmation.

### 4. Google Cloud Run Free Tier ⚠️ wrong shape

- **2M requests/month** + **1 GiB egress/month** (North America) free, perpetual.
- Cloud Run is **request-driven serverless** — instances scale to zero. The API fits naturally (with cold-start tolerance); **the scheduler does not**.
- Cloud Run **Jobs** + **Cloud Scheduler** can host scheduled work, but that's the Approach C-style rewrite, not lift-and-shift.

**Verdict:** Free-tier API hosting is real and useful, but the scheduler must be re-architected exactly the way Approach C describes. Not a lift-and-shift.

### 5. Render Free Tier ❌ disqualified

- Free web services **spin down after 15 minutes idle**, ~1 minute cold-start. ([source](https://render.com/docs/free))
- 750 instance-hours/workspace/month.
- Free **does not include background workers**.

**Verdict:** Disqualified. The API can't tolerate cold starts well, and the scheduler can't run on it at all.

### 6. Fly.io "free allowance" ❌ no longer truly free

Fly.io changed their model: there is no free plan in 2026. The cheapest entry is the Hobby plan with usage-based billing; very small machines bill at ~$2/mo, but **the Hobby plan itself requires a paid subscription**. ([source](https://fly.io/docs/about/pricing))

**Verdict:** Treat as a paid option (~$2-3/mo for the smallest always-on machine), not as free.

### 7. Vercel / Netlify ❌ wrong shape

Both are serverless-function-first; long-lived process not supported. Netlify analysed in detail in [Approach D](./cloudflare-migration-approach-d-netlify-alternative.md). Vercel has the same fundamental constraint plus stricter timeouts. Not applicable.

---

## Cheapest paid options ($3–8/mo bracket)

Pricing as of 2026-05. All numbers cross-checked from official docs where possible. Where a plan can't actually run Playwright due to RAM, that's flagged explicitly.

| Provider / plan | Monthly | RAM | vCPU | Egress | Playwright fit | Operational model |
| --- | --- | --- | --- | --- | --- | --- |
| **AWS Lightsail** (Linux IPv6-only) | **$3.50** | 0.5 GB | 2 | 1 TB | ❌ too small | Self-managed VPS |
| **Hetzner CAX11 (ARM)** | **€3.79 (~$4.20)** | 4 GB | 2 (shared) | 20 TB (EU) | ✅ | Self-managed VPS |
| **Hetzner CX22 (x86)** | **€3.85 (~$4.25)** | 4 GB | 2 (shared) | 20 TB (EU) | ✅ | Self-managed VPS, x86 if Playwright ARM gives you trouble |
| **DigitalOcean Droplet basic** | **$4** | 0.5 GB | 1 | 500 GB | ❌ too small | Self-managed VPS |
| **Fly.io shared-cpu-1x 256MB** | **~$2.02** (per-second) | 256 MB | 1 (shared) | 100 GB | ❌ too small | Managed |
| **Fly.io shared-cpu-2x 1GB** | **~$8** (per-second) | 1 GB | 2 (shared) | 100 GB | ⚠️ borderline | Managed |
| **DigitalOcean App Platform basic** | **$5** | 0.5 GB | 1 | 50 GB | ❌ too small | Managed PaaS |
| **DigitalOcean Droplet 1 GB** | **$6** | 1 GB | 1 | 1 TB | ⚠️ borderline | Self-managed VPS |
| **Cloudflare Containers** (via Workers Paid) | **$5** + overage | up to 12 GiB instance types; $5 includes 25 GiB-hr memory + 375 vCPU-min/mo | up to 4+ vCPU on larger instances | 1 TB included | ✅ on standard instances | Managed (per-second billing within Workers) |
| **Railway Hobby** (current) | **$5** + overage | $10/GB-mo overage | $20/vCPU-mo overage | $0.05/GB | ✅ as configured today | Managed PaaS |
| **Render Starter** | **$7** | 0.5 GB | 0.5 | unlimited | ❌ too small for Playwright tier | Managed PaaS |

### Things that look cheap but aren't, in context

- **AWS Lightsail $3.50 / DO $4 droplet / Render $7 Starter** all advertise prominently but ship 0.5 GB RAM. With Chromium running, you'll OOM. They become viable **only if** the Cloudflare Browser Rendering migration finishes first and Playwright is removed from the scheduler.
- **Fly.io's $2 number** is real but for a 256 MB machine. Same 0.5 GB problem.
- **Hetzner is an outlier**: at €3.79 you get 4 GB RAM. That's because Hetzner is a German hosting company with no marketing tax in their pricing — the catch is it's a VPS, not a PaaS, so you operate it yourself.

### Things that are genuinely competitive

- **Hetzner CAX11 (€3.79)** is the cheapest plan in this whole table that can actually run Playwright today, and it's the cheapest by a wide margin. Cost-per-RAM is roughly **8–10x better** than DigitalOcean App Platform / AWS Lightsail / Render at the same workload size.
- **Cloudflare Containers ($5 with included allowances)** is the cheapest *managed* option that can run Playwright, **if** the included allowances (25 GiB-hours memory + 375 vCPU-minutes) cover the workload. Quick math: 25 GiB-hours / 720 hours per month = a sustained ~35 MiB always-on, which is **far less than what either of our processes needs** — meaning real usage will exceed the included allowance and incur additional charges. Worth modeling against actual workload before treating as $5/mo.
- **Railway Hobby ($5 + overage)** is what we're paying today and is roughly comparable to Cloudflare Containers economics, with similar overage exposure.

---

## Recommendations by scenario

### Scenario A — "Cheapest possible, I'll operate the VM"

**Winner: Oracle Cloud Always Free → fall back to Hetzner CAX11 (€3.79).**

This is the only $0 path that works for our constraints in 2026. If Oracle's regional capacity makes provisioning frustrating, Hetzner CAX11 at ~$4/mo is the next-cheapest option that can actually fit both processes including Chromium. Both are self-managed VMs: you'd run both processes via systemd or a docker-compose, terminate TLS at Caddy/Nginx, ship logs somewhere yourself. Estimated ops overhead: a one-time setup of a few hours, plus ongoing OS-update discipline.

**Reasonability check:** Are we OK doing Linux ops? Today on Railway we are not — the platform handles that. Going to a VPS reverses that decision deliberately.

### Scenario B — "Cheapest managed (no VM ops), willing to accept some change"

**Tied: Cloudflare Containers ($5) ≈ Railway Hobby ($5) for now.**

If we stay on Railway, we're already in this tier — there is no cheaper *managed* option in 2026 that can actually host both processes including Playwright. Moving to Cloudflare Containers would not save money in absolute terms; it would only save money **if** the included Workers Paid allowances cover the workload (verify against real telemetry first), and it would unlock Cloudflare-native integrations (Browser Rendering, R2, Queues) that Railway doesn't have.

In other words: the cost question and the platform question are genuinely separate. Railway is already at the floor of the managed market.

### Scenario C — "Cheapest hybrid: managed API + DIY scheduler"

**API on Cloudflare Workers (free tier covers ~10M requests/mo with Workers Paid, or 100k/day on Workers Free) + scheduler on Hetzner CAX11 (€3.79) = ~$0–5/mo combined.**

This is a genuine cost-floor architecture, but it requires the **Approach B rewrite** of the API (Express → Hono). It is the cheapest realistic answer if (a) we're willing to do the API rewrite and (b) we're willing to operate one VM for the scheduler.

### Scenario D — "Cheapest possible, *if* Playwright disappears"

If the Cloudflare Browser Rendering POC succeeds and Playwright is removed from the scheduler, the RAM floor drops from ~1 GB to ~256 MB, and the cheap tier table reshuffles dramatically:

- **AWS Lightsail $3.50** becomes viable.
- **DigitalOcean $4 droplet** becomes viable.
- **Fly.io $2 256 MB machine** becomes viable for either process.
- **Koyeb free tier** becomes viable for the API.
- **Cloud Run free tier (2M requests/month)** plus a Cloud Scheduler-driven scheduler rewrite becomes a $0/mo path.

This is why **Q3 in the open-questions doc** (Playwright timeline) matters for cost as well as for architecture: it controls our realistic price floor.

---

## Per-runtime fit cheat-sheet

For when the survey is being used to design a split deployment.

### API runtime (`src/apps/api`) — relatively easy to host cheaply

Lightweight Express. CPU/RAM needs are small at current traffic. Compatible with most cheap tiers including 256–512 MB ones, **as long as no API endpoint transitively imports Playwright**.

Cheapest options:
- $0: Oracle Cloud Always Free (a single small Ampere instance).
- $0: Cloudflare Workers Free (100k requests/day, after Hono port).
- $2–3/mo: Fly.io 256 MB shared.
- ~$4/mo: Hetzner CAX11 (running both processes on the same VM is more cost-efficient than splitting).

### Scheduler runtime (`src/apps/scheduler`) — the expensive part, today

Long-lived. Holds in-memory cron state. Includes Playwright (~1+ GB RAM floor). Cannot run on any serverless platform today without rewrite.

Cheapest options:
- $0: Oracle Cloud Always Free.
- ~$4/mo: Hetzner CAX11 (4 GB ARM).
- $5–8/mo: Fly.io 1 GB+ shared, Cloudflare Containers, Railway Hobby.

If Playwright is removed, the scheduler becomes much cheaper to host or could be re-architected as a serverless cron-tick worker (Approach C).

---

## Caveats and gotchas you'll trip over

1. **Egress costs** are the silent killer on every cloud platform. Railway charges $0.05/GB; AWS charges $0.09/GB (out to internet); Cloudflare gives 1 TB free; Hetzner gives 20 TB free in EU; Oracle gives 10 TB free. If we end up serving real frontend traffic through this API (vs. just a small admin/demo), egress alone can dwarf compute cost.
2. **ARM vs x86.** Oracle's free tier and Hetzner CAX11 are ARM. Most things just work on ARM (Node, Postgres client, Sentry, AWS SDK). Playwright/Chromium **does** support ARM but the install path is fiddlier; verify the existing `Dockerfile` builds on ARM before committing. This is a small risk, not a blocker.
3. **Self-managed VPS hidden costs.** When we say "Hetzner CAX11 €3.79", we mean compute. We do not mean: TLS certificates (Let's Encrypt is $0 but takes setup), monitoring (free tiers exist but require setup), log retention (also requires setup), backups (extra €1.20/mo on Hetzner for snapshots), DDoS protection (basic level included). Add ~30–60 minutes of ops setup per service, plus the ongoing operator-attention cost.
4. **"Free tier" capacity availability.** Oracle's home-region capacity for ARM instances is reported as inconsistent. This is the single biggest delivery risk for the $0 plan.
5. **Single-region risk.** Most of these cheap options put us in one region. If the app's users are global, edge-style platforms (Cloudflare Workers, Cloud Run with multi-region) start mattering more — and those aren't a lift-and-shift conversation, they're Approach B/C.
6. **Backups of in-process state.** None of our processes hold non-recoverable in-memory state today (the source of truth for cron is in Postgres, courtesy of `CRON_DEFINITION_SERVICE.listDefinitions` in `src/apps/scheduler/recurring.ts:78`). So a host failure costs us at most a few seconds of in-flight work — that recovery is what `deferInFlightRunsOnStartup` handles. This is a genuine point in favor of cheap-VPS options: we don't need expensive HA.

---

## How this informs the migration approach docs

This survey changes the cost framing for each existing approach:

- **Approach A (Cloudflare Containers):** No cheaper than what we pay today on Railway. The cost case is neutral; the case for Approach A is convenience and Cloudflare ecosystem fit, not savings.
- **Approach B (Workers API + Containers Scheduler):** *Could* be cheaper than today **if** the API moves to Workers (free or near-free under workload) and the scheduler stays in a $5-bracket Container. Realistically: marginal savings, traded against the API rewrite cost.
- **Approach C (Workers everywhere):** *Could* be the cheapest managed option at scale, especially if Playwright is gone (no Container at all). Trade-off: largest rewrite.
- **Approach D (Netlify):** Cost is **not the reason** to choose this. Netlify Functions free tier looks cheap on paper, but D1 still requires a second host for the scheduler.
- **A previously unconsidered option — DIY VPS (Oracle / Hetzner)** — is genuinely the cheapest path on the table, **if** we're willing to take on Linux ops. It is missing from the migration-approach docs because they all assumed managed PaaS-or-better. This is a real omission worth surfacing.

If cost dominates the decision, the order of preference is roughly:

1. Oracle Cloud Always Free ($0, self-managed)
2. Hetzner CAX11 (~$4, self-managed)
3. Cloudflare Containers / Railway Hobby (~$5, managed) — ~tie
4. Approach C with Playwright eliminated (could approach $0–5, managed)

If cost is one of several factors and convenience matters too, this list collapses to "stay on Railway or move to Cloudflare Containers — neither will save you meaningful money, so pick on architectural merit instead."

---

## What I'd flag before any decision is made

1. **Get one month of real telemetry** from Railway (current RAM used, vCPU used, egress, request volume) so we can plug actual numbers into Cloudflare Containers' included-allowance math instead of guessing. Today's framing ("$5 includes 25 GiB-hours") only translates to "free or not free" against real workload.
2. **Verify Playwright's path on ARM** before committing to any ARM-only platform (Oracle, Hetzner CAX11). One afternoon of validation, not a project.
3. **Decide whether self-managed VM ops is on the table** before optimizing further. The VPS options dominate the price comparison, but only if we're willing to operate them. If not, cross them out and the floor jumps to ~$5/mo managed.

---

## Sources (verified 2026-05)

- Oracle Cloud Always Free Tier — [docs.oracle.com](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm)
- Hetzner CAX11 — [hetzner.com/cloud/cost-optimized](https://www.hetzner.com/cloud/cost-optimized)
- Railway pricing — [docs.railway.com/reference/pricing](https://docs.railway.com/reference/pricing)
- Render pricing — [docs.render.com/pricing](https://docs.render.com/pricing) and [render.com/docs/free](https://render.com/docs/free)
- Fly.io pricing — [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing)
- Koyeb pricing — [koyeb.com/docs/faqs/pricing](https://www.koyeb.com/docs/faqs/pricing)
- Northflank free developer plan — [northflank.com/changelog/free-developer-projects](https://northflank.com/changelog/free-developer-projects)
- Cloud Run pricing — [cloud.google.com/run/pricing](https://cloud.google.com/run/pricing)
- DigitalOcean droplets — [digitalocean.com/pricing/droplets](https://www.digitalocean.com/pricing/droplets)
- AWS Lightsail pricing — [aws.amazon.com/lightsail/pricing](https://aws.amazon.com/lightsail/pricing/)
- Cloudflare Containers pricing — [developers.cloudflare.com/containers/pricing](https://developers.cloudflare.com/containers/pricing)

> Pricing changes frequently. Re-verify these sources directly before treating any number above as a commitment.
