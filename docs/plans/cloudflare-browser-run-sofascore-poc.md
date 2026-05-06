# Cloudflare Browser Run SofaScore POC

## Status

Draft / spike.

## Goal

Measure whether Cloudflare Browser Run can fetch SofaScore JSON endpoints more reliably than Railway-hosted Playwright when the Railway failures are `403/challenge`.

This is an evidence-gathering spike, not a production migration.

## Phase 0 - Architecture Boundary

### What This POC Owns

1. A small Cloudflare Worker that launches a managed browser through Cloudflare Browser Run.
2. A signed HTTP endpoint that accepts a SofaScore public warmup URL and a SofaScore JSON URL.
3. Provider fetch telemetry:
   - warmup status
   - JSON request status
   - response URL
   - response snippet
   - parsed JSON when available
   - timing metadata
4. URL allowlisting for SofaScore-only requests.

### What This POC Does Not Own

1. Data Provider V2 business workflows.
2. PostgreSQL writes.
3. Execution jobs.
4. S3 report upload.
5. Slack notifications.
6. Scheduler integration.
7. Queue or worker migration.
8. Proxy or challenge-bypass strategy.

### Error Contract

The Worker returns JSON with this stable shape:

```ts
type ProbeResponse = {
  ok: boolean;
  requestId?: string;
  warmup?: ProbeNavigationResult;
  fetch?: ProbeNavigationResult;
  parsedJson?: unknown;
  error?: {
    message: string;
    stage: 'auth' | 'validation' | 'warmup' | 'fetch' | 'parse' | 'unexpected';
    causeMessage?: string;
  };
  timings: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
};
```

The API caller should classify `403/challenge` after reading the returned status/snippet. The Cloudflare Worker only reports technical facts.

### Non-Goals

1. Do not add Cloudflare as a production V2 transport yet.
2. Do not replace Railway-hosted Playwright.
3. Do not scrape SofaScore DOM.
4. Do not add AI parsing.
5. Do not add storage-state persistence yet.
6. Do not add durable browser-session reuse yet.
7. Do not alter existing cron targets.

## Approach Options

### Option A - Browser Run Worker Binding

Use `@cloudflare/playwright` inside a Cloudflare Worker with a browser binding.

Pros:
1. Closest to the current V2 Playwright mental model.
2. Lets us warm the public page and then fetch the JSON endpoint in one browser context.
3. Smallest testable unit.

Cons:
1. Requires deploying a Worker.
2. Cloudflare Browser Run requests may still be identified as bot traffic.

This is the selected POC path.

### Option B - Browser Run Quick Actions REST API

Use Cloudflare's REST endpoints for simple browser tasks.

Pros:
1. Less custom code.
2. Fast to test for simple content extraction.

Cons:
1. Less control over warmup plus JSON fetch in a single context.
2. Not a clean match for our current provider transport needs.

### Option C - Cloudflare Containers

Run a containerized Node/Playwright worker on Cloudflare Containers.

Pros:
1. More like our existing Docker runtime.
2. Could eventually host a fuller worker.

Cons:
1. Larger infra change.
2. More expensive and slower to validate than a Browser Run Worker.
3. Does not directly answer whether Cloudflare's managed browser context avoids the current `403/challenge` pattern.

## Test Plan

1. Deploy the isolated Worker.
2. Call it with one known SofaScore tournament warmup URL and one known JSON endpoint.
3. Repeat 50 to 100 times across endpoints that fail on Railway:
   - rounds
   - standings
   - team events
   - match event
4. Record:
   - total attempts
   - successful JSON responses
   - `403/challenge` count
   - non-403 failures
   - median latency
   - p95 latency
5. Compare with Railway V2 reports for the same endpoint set.

## Decision Gate

Proceed to a real Data Provider V2 transport adapter only if Cloudflare materially reduces `403/challenge` failures for representative SofaScore endpoints.

If Cloudflare still returns frequent `403/challenge`, do not integrate it into V2. Reassess provider strategy, proxy/browser providers, or paid sports data APIs.
