# Cloudflare Browser Rendering API SofaScore POC

## Goal

Validate whether Cloudflare Browser Run Quick Actions can fetch SofaScore API JSON directly through the REST `/content` endpoint.

## Hypothesis

Some SofaScore JSON endpoints may not require same-browser warmup when opened from Cloudflare's managed browser environment.

If true, Quick Actions could be simpler than a deployed Worker Browser Session for direct JSON reads.

## Test Shape

Call:

```text
POST https://api.cloudflare.com/client/v4/accounts/<account-id>/browser-rendering/content
```

Payload:

```json
{
  "url": "https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total",
  "gotoOptions": {
    "waitUntil": "domcontentloaded",
    "timeout": 30000
  }
}
```

Measure:

- HTTP status from Cloudflare
- `X-Browser-Ms-Used`
- whether SofaScore JSON is present
- whether challenge HTML is present
- whether Cloudflare returns `429`

## Non-Goals

- No Best Shot production integration
- No database writes
- No Data Provider V2 changes
- No same-browser warmup validation
- No Worker deploy

## Important Constraint

Quick Actions are stateless. They do not prove that a public SofaScore page visit can warm up a later JSON request.

Same-context warmup remains a Browser Session concern using Playwright, Puppeteer, or CDP.

## Decision Criteria

Pass:

- Cloudflare returns `200`
- body contains parseable SofaScore JSON
- no challenge detected
- browser time and latency are acceptable

Fail:

- `403`
- challenge HTML
- no parseable SofaScore JSON
- unacceptable rate limiting or cost

## Tool

The runnable probe lives at:

```text
tools/cloudflare-browser-rendering-api-probe
```
