# Node Hosting Options for This App

Pricing data: 2026-05. Re-check before committing — these tiers move around.

## What I'm comparing

Just platforms that run our app the way Railway does today: two Node processes (API + scheduler), kept up 24/7, deployed from Git or a Dockerfile. No app rewrite required.

## What I'm not comparing

Cloudflare Workers, Netlify/Vercel functions, AWS Lambda, Cloud Run, anything serverless. Out of scope per the request.

## Context that affects which tiers actually fit

The scheduler ships with **Playwright + Chromium** today, which needs roughly **1 GB+ of RAM** to run reliably. That single fact kills most "starter" plans below — they advertise loud and ship 0.5 GB. I've called that out per row.

If Playwright eventually goes away (the Browser Rendering POC), the floor drops a lot and many cheaper plans become viable. For now, assume Playwright stays.

## Managed platforms (deploy from Git, like Railway)

| Platform | Cheapest plan that fits the app | Cheapest plan that *doesn't* fit | Notes |
| --- | --- | --- | --- |
| **Railway** (current) | $5/mo Hobby + usage | — | What we have. Overage: $10/GB RAM-mo, $20/vCPU-mo. |
| **Render** | $25/mo Standard (2 GB / 1 vCPU) | $7 Starter (0.5 GB) | Background workers billed separately from web services. |
| **Fly.io** | ~$8/mo for shared-cpu-2x 1 GB | $2/mo 256 MB shared | Per-second billing, you size machines precisely. Hobby tier requires a paid sub. |
| **Heroku** | Performance-M ~$250/mo (2.5 GB) | $7 Basic (512 MB), $5 Eco (sleeps) | Heroku is expensive for our RAM needs. Eco sleeps on idle, so it's not viable for the scheduler anyway. |
| **DigitalOcean App Platform** | $12/mo Pro (1 GB / 1 vCPU) | $5 Basic (0.5 GB) | Closest 1:1 alternative to Railway, slightly more expensive at the 1 GB tier. |
| **Sevalla** (was Kinsta App Hosting) | $10/mo Standard S1 (1 GB / 0.5 CPU) | $5 Hobby (0.3 GB, no custom domain) | Solid Heroku-style PaaS. Has a hibernation feature if anything ever goes idle. |
| **Koyeb** | Pay-per-second from ~$0.000001/sec (small instances) | Free 1 instance (very small) | Free tier exists; useful only if you can fit in tight specs. |

Translation of the table: at the "actually fits Playwright" level, **all the managed PaaS options cluster at $5–25/mo**, and Railway is already at the bottom of that range. Switching to another managed PaaS is unlikely to save money on its own.

## VPS option (you run Linux yourself)

If you'd rather operate a server, there's one clear value pick:

- **Hetzner CAX11**: €3.79/mo (~$4.20). 4 GB RAM, 2 ARM vCPUs, 40 GB SSD, 20 TB egress (EU). Cheapest plan in the whole comparison that can comfortably run Playwright.
- You set up Docker, systemd or docker compose, TLS via Let's Encrypt, log shipping, OS updates. ~A few hours of setup. Then it just sits there.

Other VPS options for completeness:
- **AWS Lightsail** — $3.50/mo IPv6-only, 0.5 GB. Doesn't fit Playwright.
- **DigitalOcean Droplet** — $4/mo, 0.5 GB. Same problem. $6/mo for 1 GB starts being viable.

## True $0/mo option

- **Oracle Cloud Always Free** — up to 4 ARM Ampere cores + 24 GB RAM total, perpetual, no card-then-charge surprise. You install Docker on it and run both processes like a normal Linux server.
- Real caveats: ARM-instance capacity in popular regions is reportedly inconsistent; you're locked to one home region forever once chosen; if you ever exceed the free quotas, all instances get deleted after 30 days. Same self-managed model as a VPS — but free.

## My honest take

For this app today, with Playwright still in the scheduler:

- **Cheapest managed, no rewrite**: stay on Railway. None of the alternatives are meaningfully cheaper at the 1 GB tier.
- **Cheapest paid, self-managed**: Hetzner CAX11 at €3.79/mo. ~10x cheaper than the managed options for the same RAM.
- **Cheapest free, self-managed**: Oracle Cloud Always Free, if you can stomach the home-region capacity lottery.
- **If you want a managed PaaS that isn't Railway** for non-cost reasons (UX, region, integrations, whatever): DigitalOcean App Platform and Sevalla are the closest 1:1 substitutes. Both ~$10/mo for a comparable plan.

If the goal is "spend less", the cheapest path is not "different managed PaaS" — it's either moving to a VPS, or finishing the work that removes Playwright (which would open up the 0.5 GB tiers under $5/mo).

If the goal is anything other than cost, this list alone won't decide it.

## Sources

- Railway: https://docs.railway.com/reference/pricing
- Render: https://docs.render.com/pricing
- Fly.io: https://fly.io/docs/about/pricing
- Heroku: https://devcenter.heroku.com/articles/usage-and-billing
- DigitalOcean: https://www.digitalocean.com/pricing/app-platform, https://www.digitalocean.com/pricing/droplets
- Sevalla: https://sevalla.com/application-hosting/pricing
- Koyeb: https://www.koyeb.com/docs/faqs/pricing
- Hetzner Cloud: https://www.hetzner.com/cloud
- AWS Lightsail: https://aws.amazon.com/lightsail/pricing
- Oracle Cloud Always Free: https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm
