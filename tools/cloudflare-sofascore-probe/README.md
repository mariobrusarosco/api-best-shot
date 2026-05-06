# Cloudflare SofaScore Probe

This is an isolated Cloudflare Browser Run spike for testing SofaScore JSON access outside Railway.

It does not write to the Best Shot database and does not participate in Data Provider V2 execution jobs.

## What It Tests

The Worker:

1. validates a signed probe request
2. allowlists SofaScore URLs only
3. launches a Cloudflare-managed browser
4. warms a public SofaScore page
5. requests a SofaScore JSON endpoint in the same context
6. returns status, snippets, parsed JSON when available, and timings

## From Zero To Deployed

This probe does not require a Railway deploy or a Best Shot API production deploy. It only deploys a standalone Cloudflare Worker.

### 1. Create Or Log In To Cloudflare

Open:

```text
https://dash.cloudflare.com/sign-up
```

Create an account or log in.

### 2. Choose A Workers Subdomain

In the Cloudflare dashboard, go to:

```text
Workers & Pages
```

If Cloudflare asks for a `workers.dev` subdomain, choose one, for example:

```text
bestshotprobe
```

The deployed Worker URL will use this shape:

```text
https://cloudflare-sofascore-probe.bestshotprobe.workers.dev
```

The probe endpoint will be:

```text
https://cloudflare-sofascore-probe.bestshotprobe.workers.dev/fetch-json
```

If you pick a different subdomain, replace `bestshotprobe` with the one you chose.

### 3. Install Dependencies

From this directory:

```bash
npm install
```

### 4. Log In With Wrangler

```bash
npx wrangler login
```

Approve Cloudflare access in the browser window that opens.

### 5. Set The Probe Token

Pick a long secret token and store it in Cloudflare:

```bash
npx wrangler secret put PROBE_TOKEN
```

Paste the token when prompted. You will also use this same token in the `authorization` header when calling the probe.

### 6. Optional Remote Dev

```bash
npm run dev
```

This runs Wrangler against Cloudflare remote bindings so Browser Run can be exercised before a permanent deploy.

### 7. Deploy

```bash
npm run deploy
```

Wrangler prints the deployed Worker URL. Copy it. The final fetch endpoint is that URL plus `/fetch-json`.

### 8. Health Check

If Wrangler prints:

```text
https://cloudflare-sofascore-probe.bestshotprobe.workers.dev
```

Run:

```bash
curl https://cloudflare-sofascore-probe.bestshotprobe.workers.dev
```

Expected:

```json
{
  "status": "ok",
  "service": "cloudflare-sofascore-probe"
}
```

## Request

```bash
curl -X POST "https://cloudflare-sofascore-probe.bestshotprobe.workers.dev/fetch-json" \
  -H "content-type: application/json" \
  -H "authorization: Bearer YOUR_PROBE_TOKEN" \
  -d '{
    "requestId": "manual-test-1",
    "warmupUrl": "https://www.sofascore.com/football/tournament/...",
    "jsonUrl": "https://www.sofascore.com/api/v1/unique-tournament/.../season/.../standings/total"
  }'
```

Replace `bestshotprobe` with your real `workers.dev` subdomain, and replace `YOUR_PROBE_TOKEN` with the token you stored in Cloudflare.

## Repeated Probe

After deployment, copy `.env.example` to `.env` and fill in real values. Then run:

```bash
npm run probe:many
```

This sends sequential requests and prints a compact summary with success count, `403` count, challenge count, and latency.

## Result Shape

```json
{
  "ok": true,
  "requestId": "manual-test-1",
  "warmup": {
    "ok": true,
    "status": 200,
    "requestUrl": "https://www.sofascore.com/...",
    "responseUrl": "https://www.sofascore.com/...",
    "bodySnippet": "..."
  },
  "fetch": {
    "ok": true,
    "status": 200,
    "requestUrl": "https://www.sofascore.com/api/...",
    "responseUrl": "https://www.sofascore.com/api/...",
    "bodySnippet": "{...}"
  },
  "parsedJson": {},
  "timings": {
    "startedAt": "2026-05-03T00:00:00.000Z",
    "completedAt": "2026-05-03T00:00:01.000Z",
    "durationMs": 1000
  }
}
```

## Notes

Cloudflare Browser Run documentation states that requests from Browser Run are identified as bot traffic. This probe is only meant to measure whether Cloudflare's browser context gets fewer SofaScore `403/challenge` responses than Railway.
