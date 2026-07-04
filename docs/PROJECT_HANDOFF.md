# Best Shot Project Handoff

## One-Sentence Summary

Best Shot is a football prediction app: users make guesses about real matches, the app keeps football data updated from an external provider, and then calculates scores and leaderboards from real match outcomes.

## What The App Does

The app has three core responsibilities:

```text
1. Serve product data to users
2. Keep football data up to date
3. Calculate scores and leaderboards
```

Everything else exists to support those three responsibilities.

```mermaid
flowchart LR
  A["Football Provider<br/>SofaScore or replacement"] --> B["Football Data Updater"]
  B --> C["Best Shot Database"]
  C --> D["Product API"]
  D --> E["Users / Admins"]

  E --> F["Guesses / Predictions"]
  F --> C

  C --> G["Scoring Engine"]
  G --> H["Leaderboards"]
  H --> C
```

## The Product In Plain English

Users need to see real football tournaments, teams, matches, standings, and match statuses. They make predictions around those matches. Once the real matches are played, the app uses the final results to calculate points and rank members.

The database is the source of truth for the product experience. User-facing requests should read from our database, not call SofaScore live.

```mermaid
sequenceDiagram
  participant User
  participant API as Best Shot API
  participant DB as Database

  User->>API: Open app / tournament / leaderboard
  API->>DB: Read normalized app data
  DB-->>API: Tournaments, matches, guesses, rankings
  API-->>User: Product response
```

## The Most Important Dependency

The app only works if football data is fresh enough.

Without external football data, the app cannot reliably know:

```text
- which tournaments exist
- which teams belong to them
- which matches exist
- when matches start
- whether matches are scheduled, live, postponed, or ended
- final scores
- standings
- current rounds
```

So the football data updater is not a side feature. It is part of the core product engine.

## The Three Planes Of The App

### 1. Product API

The Product API serves app data to users and admins.

It should be boring and reliable:

```text
request comes in
read database
apply authorization/business rules
return response
```

It should not scrape pages, launch browsers, or depend on SofaScore during normal user requests.

### 2. Football Data Updater

The Football Data Updater gets external football data and turns it into app data.

It has two main jobs:

```text
Initial assembly:
  build a tournament with teams, rounds, matches, and standings

Ongoing updates:
  keep matches, tournaments, teams, standings, and live status fresh
```

It should be observable, retryable, and easy to reason about.

### 3. Async Scoring And Leaderboards

The scoring layer calculates derived app state.

Examples:

```text
- match prediction outcomes
- member points
- tournament rankings
- global/member leaderboards
- recalculations after corrected match data
```

This work does not need to happen inside user requests. It should run asynchronously after relevant data changes.

## Core Data Concepts

The app needs durable data for:

```text
- tournaments
- seasons / rounds
- teams
- matches
- standings
- users / members
- guesses / predictions
- scores
- leaderboards
- provider job history
- provider reports / raw responses
```

Provider data and app data are not the same thing.

```mermaid
flowchart TD
  A["Raw Provider Data"] --> B["Normalize / Validate"]
  B --> C["Best Shot Domain Model"]
  C --> D["Database Writes"]
  D --> E["API Reads"]
  D --> F["Scoring / Leaderboards"]
```

The provider may call a team one thing today and another thing later. It may return extra fields, missing fields, or changed payload shapes. The app needs a stable internal model that does not leak provider quirks everywhere.

## Football Data Flow

The healthy ingestion flow is:

```text
plan what data is needed
fetch provider data
store/report raw result
validate response
normalize into app objects
write database idempotently
trigger downstream scoring if needed
record success/failure
```

```mermaid
flowchart TD
  A["Scheduler or Admin Action"] --> B["Plan Provider Requests"]
  B --> C["Fetch Provider Data"]
  C --> D{"Fetch Result"}
  D -->|Success| E["Save Raw Snapshot / Report"]
  D -->|Failure| F["Record Failure<br/>Retry or Alert"]
  E --> G["Validate Payload"]
  G --> H["Normalize"]
  H --> I["Idempotent Database Update"]
  I --> J{"Did Match Results Change?"}
  J -->|Yes| K["Queue Scoring / Leaderboard Work"]
  J -->|No| L["Finish Job"]
  K --> L
```

## Tournament Assembly

Tournament assembly means taking an external tournament and creating enough local data for the app to use it.

It needs to gather:

```text
- tournament identity
- teams
- rounds
- scheduled matches
- standings
- optional assets such as team/tournament images
```

```mermaid
flowchart LR
  A["Tournament URL / Provider ID"] --> B["Fetch Tournament Data"]
  B --> C["Fetch Teams"]
  B --> D["Fetch Rounds"]
  B --> E["Fetch Matches"]
  B --> F["Fetch Standings"]
  C --> G["Normalize"]
  D --> G
  E --> G
  F --> G
  G --> H["Create / Update Database"]
```

The important product outcome:

```text
After assembly, users/admins can see the tournament, teams, fixtures, and standings from our database.
```

## Live / Open Match Updates

This is the most time-sensitive workflow.

The app periodically checks matches that are live, recently started, or expected to have changed.

```mermaid
sequenceDiagram
  participant Scheduler
  participant Updater as Football Data Updater
  participant Provider as Football Provider
  participant DB as Database
  participant Scoring as Scoring Engine

  Scheduler->>Updater: Run open-match update
  Updater->>DB: Find due/open matches
  Updater->>Provider: Fetch latest match data in batch
  Provider-->>Updater: Match status and scores
  Updater->>DB: Update changed matches
  Updater->>Scoring: Trigger recalculation for ended/changed matches
  Scoring->>DB: Update scores and leaderboards
```

This workflow should optimize for:

```text
- reliability
- low duplicate work
- clear failure reports
- safe retries
- no browser launch per match
```

## Current Provider Access Problem

The app has relied on browser-based access to SofaScore because direct server-side HTTP can be blocked.

The observed production issue:

```text
local runs often work
production on Railway sometimes fails
failures are 403 / challenge responses
```

This means the hard problem is not only mapping data. The hard problem is reliably acquiring provider JSON in production.

## What We Learned From Cloudflare Tests

Cloudflare was tested as a possible provider-fetch helper.

What worked:

```text
- a Cloudflare Worker could launch a managed browser
- it could fetch a SofaScore tournament page
- it could fetch SofaScore JSON
- for one tested standings endpoint, direct JSON worked without page warmup
```

What did not scale in the first shape:

```text
- one browser launch per URL/request is not production-friendly
- free Cloudflare limits are tight
- production would require batching and/or paid limits
```

The useful conclusion:

```text
Cloudflare may be a good fetch adapter.
Cloudflare should not become the brain of the app.
```

## Recommended Architecture Direction

Keep the app simple.

```text
One main app
One database
One football data updater
One async scoring path
Optional small Cloudflare fetch helper
```

```mermaid
flowchart TD
  A["Best Shot App"] --> B["Database"]
  A --> C["Football Data Updater"]
  C --> D{"Provider Fetch Method"}
  D --> E["Direct / Local Browser Fetch"]
  D --> F["Cloudflare Fetch Helper"]
  E --> G["SofaScore"]
  F --> G
  C --> B
  A --> H["Scoring / Leaderboard Jobs"]
  H --> B
```

Cloudflare, if used, should answer only one question:

```text
Given these SofaScore URLs, can you return JSON results?
```

The main app should still own:

```text
- which data to fetch
- when to fetch it
- how to normalize it
- how to write it
- how to report failures
- when to calculate scores
```

## What To Avoid

Avoid turning this into a distributed platform too early.

Do not start with:

```text
- many services
- generic workflow engines
- queues everywhere
- Cloudflare writing directly to the database
- browser-session coordination before batch fetching is proven
- AI scraping as the primary data source
```

Start small and prove each step.

## Practical Next Step

The best next engineering step is to simplify around one workflow:

```text
open-match updates
```

Why this one:

```text
- it runs frequently
- it exposes provider reliability problems quickly
- it directly affects scoring and leaderboards
- it forces the right batching behavior
```

A good first implementation should:

```text
1. find due/open matches
2. build provider URLs
3. fetch all needed URLs in one batch
4. classify success, challenge, rate limit, missing data, and provider errors
5. update changed matches
6. trigger scoring when match results change
7. write one clear report
```

## Engineering North Star

The app should become easier to operate and easier to understand.

```text
Product API:
  boring, fast, database-backed

Football Data Updater:
  small, observable, retryable, provider-aware

Provider Fetching:
  isolated behind one client/adapter

Scoring:
  async, deterministic, rerunnable

Failures:
  visible, classified, and actionable
```

## Final Mental Model

```mermaid
flowchart LR
  A["External Reality<br/>football matches happen"] --> B["Provider Data"]
  B --> C["Best Shot Data Updater"]
  C --> D["Best Shot Database"]
  D --> E["Best Shot Product"]
  D --> F["Scoring Engine"]
  F --> G["Leaderboards"]
  G --> E
```

The project succeeds when this loop is reliable:

```text
real football changes
provider data is fetched
database is updated
guesses are scored
leaderboards are refreshed
users see trustworthy results
```

