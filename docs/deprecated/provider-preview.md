# Slice 1: Provider Preview

## Purpose

Before building Game tables, tournament imports, scoring, or leaderboards, we need to prove that the API can fetch real provider data reliably.

This slice answers one question:

```text
Can the Football Platform API access SofaScore data from both local development and a deployed environment?
```

If we cannot get provider data in production, there is no point building the Game domain first. Game depends on provider data for tournaments, teams, matches, standings, and match results.

## Product Context

Provider data is the input for the rest of the platform.

```text
Provider data
  -> Game tournaments
  -> Game teams
  -> Game matches
  -> Game standings
  -> Game scoring
  -> Game leaderboards
```

The API should eventually serve our own database, not make user-facing requests depend on live SofaScore calls. But before designing persistence, we need to validate that the provider access path works.

## Scope

Build a small admin-only provider preview endpoint.

The endpoint should:

```text
1. Receive a SofaScore tournament URL or provider identifiers
2. Fetch provider data from SofaScore
3. Normalize only enough data to inspect the response
4. Return a preview payload
5. Return clear errors when access fails
```

This slice should run in:

```text
local development
deployed environment
```

## Non-Goals

Do not write to the database in this slice.

Do not build:

```text
Game schema
tournament import
match import
standings persistence
scoring
leaderboards
scheduler
open-match sync
Cloudflare Browser Rendering integration
Playwright production setup
```

Those decisions come after provider access is proven.

## Provider Preview Contract

### Endpoint

```text
POST /api/admin/provider-preview
```

This endpoint is an admin/operator tool. It is not a public product endpoint.

### Contract Decision

For the first implementation, keep the endpoint simple:

```text
Receive SofaScore URLs.
Fetch them.
Return the data.
If something fails, return the error.
```

Do not parse tournament pages yet.

Do not write to the database.

Do not introduce transports, use cases, operation runners, browser warmups, reports, or provider architecture layers.

Implementation decision after local validation:

```text
The endpoint uses Playwright headless Chromium.
The SofaScore API request runs inside the browser page context.
Plain server-side fetch is not part of the implementation because it returned 403 for the tested provider URLs.
The response includes warmup diagnostics so local and deployed browser behavior can be compared directly.
```

### Request

```json
{
  "urls": [
    "https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total"
  ]
}
```

Multiple URLs are allowed so we can test standings, teams, matches, and other important SofaScore endpoints in one request.

### Request Rules

```text
urls must be an array
urls must contain at least 1 URL
urls should be capped at 10 URLs
each URL must use https
each URL must belong to sofascore.com or a SofaScore subdomain
```

### Successful Response

```json
{
  "ok": true,
  "mode": "playwright-headless-chromium",
  "warmup": {
    "url": "https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390",
    "ok": true,
    "status": 200,
    "finalUrl": "https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390"
  },
  "results": [
    {
      "url": "https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/17",
      "ok": true,
      "status": 200,
      "data": {
        "events": []
      }
    }
  ]
}
```

### Failure Response

If one or more URLs fail, return the failure beside the URL that failed.

```json
{
  "ok": false,
  "mode": "playwright-headless-chromium",
  "warmup": {
    "url": "https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390",
    "ok": false,
    "status": 403,
    "finalUrl": "https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390"
  },
  "results": [
    {
      "url": "https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/17",
      "ok": false,
      "status": 403,
      "data": {
        "error": {
          "code": 403,
          "reason": "Forbidden"
        }
      },
      "error": "Provider returned 403"
    }
  ]
}
```

### Done Criteria For Task 1

Task 1 is done when the slice has a simple contract for:

```text
endpoint
request body
request rules
success response
failure response
```

## Validation Matrix

| Environment | Expected Result | Meaning |
| --- | --- | --- |
| Local works, deployed works | Proceed to Game schema/import slice | Provider access is viable enough to continue |
| Local works, deployed fails | Solve provider infrastructure first | Game persistence would be premature |
| Local fails, deployed fails | Provider strategy is wrong or endpoint assumptions are wrong | Fix provider approach before product work |
| Local fails, deployed works | Local setup issue | Production path may still be viable |

## Deployment Priority

Deploy is part of this slice, but not the first step.

Recommended order:

```text
1. Build Provider Preview locally
2. Verify it locally
3. Deploy the minimal API
4. Run the same Provider Preview in the deployed environment
5. Compare local vs deployed results
```

Cloud deployment matters because provider access is environment-sensitive. Local success does not prove production success.

## Implementation Breakdown

Build this slice in small steps:

1. [x] Define the provider preview contract
2. [x] Add the admin route shell
3. [x] Parse and validate the request input
4. [x] Fetch one simple SofaScore endpoint
5. [x] Return fetched data or a simple error for each URL
6. [x] Verify with a real standings URL
7. [x] Verify with a real matches/events URL
8. [ ] Keep provider errors clear enough to compare local and deployed behavior
9. [ ] Verify locally with real SofaScore URLs
10. [ ] Deploy the minimal API
11. [ ] Verify the same URLs in the deployed environment

Keep each step independently testable. The first working version can return only metadata and standings; teams and matches can follow once the provider path is proven.

Suggested first implementation target:

```text
POST /api/admin/provider-preview
input: SofaScore URLs
output: fetched data or errors
```

Do not add persistence until local and deployed provider access are both understood.

## Local Verification Results

### 2026-07-05: Standings URL

Request tested through the local API:

```text
POST /api/admin/provider-preview
```

Input URL:

```text
https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total
```

Result:

```json
{
  "ok": false,
  "results": [
    {
      "url": "https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total",
      "ok": false,
      "status": 403,
      "error": "Provider returned 403"
    }
  ]
}
```

Meaning:

```text
Plain server-side fetch reached SofaScore, but SofaScore rejected the request with 403.
```

This is a valid verification result. It means the first provider access path is blocked locally for this standings endpoint.

### 2026-07-05: Matches/Events Round URL

Request tested through the local API:

```text
POST /api/admin/provider-preview
```

Input URL:

```text
https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/18
```

Result:

```json
{
  "ok": false,
  "results": [
    {
      "url": "https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/18",
      "ok": false,
      "status": 403,
      "error": "Provider returned 403"
    }
  ]
}
```

Meaning:

```text
Plain server-side fetch reached SofaScore, but SofaScore rejected this matches/events endpoint with 403 too.
```


### 2026-07-05: Browser-backed Endpoint Current Run

Request tested through the local API:

```text
POST /api/admin/provider-preview
```

Input URL:

```text
https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/17
```

Result summary:

```text
warmup status: 403
provider API status: 403
provider API body: { "error": { "code": 403, "reason": "Forbidden" } }
```

Meaning:

```text
The local browser-backed endpoint is using the intended browser path, but SofaScore currently rejects both the warmup page and API request from that browser session.
```

## Browser Option Validation Plan

Plain server-side fetch is blocked with 403 for the tested SofaScore API URLs. The only local path that has produced successful API JSON is browser-context fetch: open a real browser page, let SofaScore establish whatever browser/session state it needs, then call `fetch()` from inside that page. Current results are still environment-sensitive, so this is not proven stable yet.

Use this URL as the first browser validation target:

```text
https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/17
```

### Option 1: Manual Browser Baseline

Status: validated.

Result:

```text
A real browser tab can open the SofaScore API URL and receive JSON.
```

This proves the endpoint itself works when SofaScore accepts the browser context.

### Option 2: Playwright Headed Browser

Status: validated.

Goal:

```text
Check whether an automated local browser can reproduce the manual browser result.
```

Steps used:

1. Opened a Playwright-controlled Chromium browser with `headless: false`.
2. Navigated to the SofaScore tournament page first.
3. Waited for browser/session state.
4. Called `fetch()` for the API URL from inside the same page context.

Result:

```json
{
  "ok": true,
  "status": 200,
  "data": {
    "events": []
  }
}
```

Meaning:

```text
Playwright headed Chromium can access the SofaScore API locally when the request runs inside the browser page context.
```

Conclusion:

```text
Local browser-based access is viable. Test headless Chromium next.
```

### Option 3: Playwright Headless Browser

Status: unstable. It worked in the initial probe, then later returned 403.

Goal:

```text
Check whether the same browser flow works without a visible browser window.
```

Steps used:

1. Used the same flow as Option 2.
2. Changed only `headless` from `false` to `true`.
3. Requested the API URL from inside the browser page context.

Result:

```json
{
  "ok": true,
  "status": 200,
  "data": {
    "events": []
  }
}
```

Meaning:

```text
Playwright headless Chromium can access the SofaScore API locally when the request runs inside the browser page context.
```

Conclusion:

```text
Headless browser access worked in the initial local probe, but a later local run returned 403 for both the warmup page and API URL. The admin preview endpoint now exposes those diagnostics directly. The next major risk is whether a deployed browser environment behaves differently or more reliably.
```

### Option 4: Playwright Persistent Profile

Goal:

```text
Check whether a reusable browser profile/session changes the result.
```

Steps:

1. Launch Playwright with a persistent user data directory.
2. Visit SofaScore once using that profile.
3. Reuse the same profile to request the API URL from page `fetch()`.
4. Test headed first, then headless if headed works.

Expected interpretation:

| Result | Meaning |
| --- | --- |
| Works | Session/profile reuse may be required. |
| 403 | Persistent browser state is still not enough locally. |

### Option 5: Deployment Browser Candidate

Only test this after one local browser option works.

Goal:

```text
Check whether the working local browser approach can run in a deployed environment.
```

Candidates to evaluate later:

```text
Node host with Playwright
Cloudflare Browser Rendering
Container-based browser runtime
```

Do not build Game persistence until one deployed browser/provider path is proven.

### Validation Notes

Do not commit browser cookies, copied cURL commands with cookies, or local browser profile data.

For each option, record:

```text
option tested
headed or headless
API URL
status code
worked or failed
short conclusion
```

## Decision Gate

Do not start the Game schema/import slice until this slice answers:

```text
Can we fetch SofaScore data from production reliably enough?
```

If the answer is yes, continue with the first Game persistence slice.

If the answer is no, prioritize provider infrastructure before building Game tables.

## Notes

The first implementation should stay boring:

```text
one endpoint
one provider
one tournament input
clear response
clear errors
no database writes
```

This slice exists to reduce risk, not to recreate the old Data Provider V2 architecture.
