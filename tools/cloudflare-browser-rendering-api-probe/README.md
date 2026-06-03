# Cloudflare Browser Rendering API Probe

This is a second isolated SofaScore probe. It tests Cloudflare Browser Run **Quick Actions** through the REST API, without deploying a Worker.

Cloudflare used to document this area as Browser Rendering. The REST endpoint still uses `/browser-rendering/...`, while the product docs now call it Browser Run Quick Actions.

## What This Tests

The probe calls:

```text
POST https://api.cloudflare.com/client/v4/accounts/<account-id>/browser-rendering/content
```

with the SofaScore JSON URL as the target `url`.

This answers one specific question:

```text
Can Cloudflare's REST Browser Rendering API open a SofaScore JSON URL directly and return the JSON body without a SofaScore page warmup?
```

## What This Does Not Test

Quick Actions are stateless. A request to the public SofaScore page and a later request to a SofaScore JSON URL do not share the same browser context.

That means this POC does not validate same-browser warmup behavior. Same-browser warmup requires Browser Sessions through Playwright, Puppeteer, or CDP.

## Why `/content`

Use `/content` for this POC because we need the raw rendered body from a URL.

Do not use `/json` for this test. Cloudflare's `/json` Quick Action is AI structured extraction from a page. Our Data Provider needs SofaScore's raw API JSON, not an AI interpretation.

## Requirements

Create a Cloudflare API token with:

```text
Browser Rendering - Edit
```

You also need your Cloudflare Account ID from the Cloudflare dashboard.

## Setup

From this directory:

```bash
cp .env.example .env
```

Edit `.env`:

```text
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_API_TOKEN=<token with Browser Rendering - Edit>
SOFASCORE_JSON_URL=https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total
```

## Run One Probe

```bash
npm run probe:content
```

Expected success signals:

```text
http=200
ok=true
sofaJson=true
challenge=false
```

The final JSON summary includes:

```text
totals.successful
totals.sofaScoreJsonDetected
totals.challenged
totals.rateLimited
totals.browserMsUsed
```

## Repeated Probe

Workers Free Quick Actions are limited to one request every 10 seconds. Keep `WAIT_MS=11000` unless the account is on Workers Paid.

```text
ATTEMPTS=6
WAIT_MS=11000
```

Then:

```bash
npm run probe:content
```

## Current Production Relevance

If this works reliably, it may be cheaper and simpler than a Worker Browser Session for endpoints that do not need same-browser warmup.

If it fails with `403`, challenge HTML, or missing JSON, then Quick Actions are not enough for that endpoint and we should stay with Browser Sessions.

If it fails with `429`, the limit is Cloudflare Quick Actions rate limiting:

```text
Workers Free: 1 Quick Action request every 10 seconds
Workers Paid: 10 Quick Action requests per second
```

## Official Docs

- Quick Actions overview: https://developers.cloudflare.com/browser-run/quick-actions/
- `/content` endpoint: https://developers.cloudflare.com/browser-run/quick-actions/content-endpoint/
- Limits: https://developers.cloudflare.com/browser-run/limits/
- Pricing: https://developers.cloudflare.com/browser-run/pricing/
