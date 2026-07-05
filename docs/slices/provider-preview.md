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

## Proposed Endpoint

```text
POST /api/admin/provider-preview
```

Example request:

```json
{
  "tournamentUrl": "https://www.sofascore.com/football/tournament/england/premier-league/17"
}
```

The endpoint may also accept explicit provider identifiers later:

```json
{
  "provider": "sofascore",
  "uniqueTournamentId": 17,
  "seasonId": 76986
}
```

Start with whichever input is simpler to implement correctly.

## Response Shape

Successful response:

```json
{
  "ok": true,
  "provider": "sofascore",
  "input": {
    "tournamentUrl": "https://www.sofascore.com/football/tournament/england/premier-league/17"
  },
  "preview": {
    "tournament": {
      "name": "Premier League",
      "providerId": 17
    },
    "season": {
      "providerId": 76986,
      "name": "25/26"
    },
    "counts": {
      "teams": 20,
      "matches": 380,
      "standingsRows": 20
    }
  },
  "timings": {
    "durationMs": 1234
  }
}
```

Failure response:

```json
{
  "ok": false,
  "provider": "sofascore",
  "error": {
    "stage": "provider_fetch",
    "kind": "blocked",
    "status": 403,
    "message": "Provider request was blocked or challenged"
  },
  "timings": {
    "durationMs": 800
  }
}
```

The exact fields can change during implementation. The important requirement is that failures are explicit enough to compare local and deployed behavior.

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

1. [ ] Define the provider preview contract
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
