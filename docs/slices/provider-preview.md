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
  "results": [
    {
      "url": "https://www.sofascore.com/api/v1/unique-tournament/17/season/76986/standings/total",
      "ok": true,
      "status": 200,
      "data": {
        "standings": []
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
2. [ ] Add the admin route shell
3. [ ] Parse and validate the request input
4. [ ] Fetch one simple SofaScore endpoint
5. [ ] Return status, timing, and a small preview payload
6. [ ] Add standings fetch
7. [ ] Add teams/matches fetch only after standings works
8. [ ] Add clear blocked/challenge/error classification
9. [ ] Verify locally with real SofaScore URLs
10. [ ] Deploy the minimal API
11. [ ] Verify the same URLs in the deployed environment

Keep each step independently testable. The first working version can return only metadata and standings; teams and matches can follow once the provider path is proven.

Suggested first implementation target:

```text
POST /api/admin/provider-preview
input: tournament URL or explicit SofaScore ids
output: provider status, timings, tournament summary, standings count, error details
```

Do not add persistence until local and deployed provider access are both understood.

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
