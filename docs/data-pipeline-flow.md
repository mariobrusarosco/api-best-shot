# Best Shot - Data Pipeline Flow

## Overview

This document visualizes the complete data pipeline that powers the Best Shot prediction system. The pipeline automates the fetching, processing, and distribution of football match data from external providers to the application's database.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA PIPELINE FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

   External Data Sources          AWS Services         Application Layer
   ─────────────────────          ────────────         ─────────────────

┌──────────────────┐
│   SofaScore API  │
│  (Match Data)    │
└────────┬─────────┘
         │
         │ JSON/API
         │
         ▼
┌──────────────────┐          ┌──────────────────┐
│  Web Scraping    │          │  AWS EventBridge │
│  (Playwright)    │          │    Scheduler     │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         │                             │ Triggers (Cron)
         │                             │
         │                             ▼
         │                    ┌──────────────────┐
         │                    │  Lambda Function │
         │                    │  (Caller/Router) │
         │                    └────────┬─────────┘
         │                             │
         │                             │ HTTP Request
         │                             │ (with auth token)
         │                             │
         │                             ▼
         │                    ┌──────────────────────────┐
         │                    │   Express.js API         │
         │                    │   Data Provider Domain   │
         │                    └────────┬─────────────────┘
         │                             │
         └─────────────────────────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  Service Layer     │
                             │  - Validation      │
                             │  - Scraping        │
                             │  - Transformation  │
                             │  - Reporting       │
                             └─────────┬──────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  PostgreSQL DB     │
                             │  - Matches         │
                             │  - Tournaments     │
                             │  - Rounds          │
                             │  - Standings       │
                             │  - Executions      │
                             └─────────┬──────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  AWS S3            │
                             │  (Execution        │
                             │   Reports)         │
                             └─────────┬──────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  Slack             │
                             │  (Notifications)   │
                             └────────────────────┘
```

---

## Detailed Pipeline Components

### 1. Scheduling Layer (AWS EventBridge Scheduler)

```
┌─────────────────────────────────────────────────────────────┐
│              AWS EventBridge Scheduler                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Daily Routine (00:01 UTC)                                 │
│  ├─> Creates schedules for today's matches                 │
│  └─> Triggers: caller-daily-routine                        │
│                                                             │
│  Score & Standings Updates (Match-specific times)          │
│  ├─> Updates scores for active matches                     │
│  ├─> Recalculates tournament standings                     │
│  └─> Triggers: caller-scores-and-standings                 │
│                                                             │
│  Knockout Updates (Post-match)                             │
│  ├─> Updates knockout brackets                             │
│  ├─> Advances teams to next rounds                         │
│  └─> Triggers: caller-knockouts-update                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Lambda Functions (Callers/Routers)

```
┌──────────────────────────────────────────────────────────────┐
│                    Lambda Functions                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  caller-daily-routine.mjs                                    │
│  ├─> Role: Create schedules for all matches                 │
│  ├─> Input: Tournament ID, Environment, API Endpoint        │
│  ├─> Output: HTTP POST to /api/v2/data-provider/scheduler   │
│  └─> Includes: Internal auth token                          │
│                                                              │
│  caller-scores-and-standings.mjs                             │
│  ├─> Role: Update match scores & standings                  │
│  ├─> Input: Match/Tournament ID, Round info                 │
│  ├─> Output: HTTP POST to /api/v2/data-provider/scheduler   │
│  └─> Includes: Internal auth token                          │
│                                                              │
│  caller-knockouts-update.mjs                                 │
│  ├─> Role: Update knockout tournament data                  │
│  ├─> Input: Tournament ID                                   │
│  ├─> Output: HTTP POST to /api/v2/data-provider/scheduler   │
│  └─> Includes: Internal auth token                          │
│                                                              │
│  Layers:                                                     │
│  ├─> best-shot-main (metadata, utilities)                   │
│  └─> sentry (error tracking)                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Express.js API (Data Provider Domain)

```
┌──────────────────────────────────────────────────────────────┐
│              Data Provider Domain                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Middleware                                                  │
│  ├─> Internal Auth Verification                             │
│  └─> Request Validation                                     │
│                                                              │
│  Controllers (NOT YET VISIBLE IN CODEBASE)                   │
│  ├─> Route incoming Lambda requests                         │
│  ├─> Parse request payload                                  │
│  └─> Delegate to Services                                   │
│                                                              │
│  Services                                                    │
│  ├─> MatchesDataProviderService                             │
│  │   ├─> init() - Create matches                            │
│  │   ├─> update() - Update all matches                      │
│  │   └─> updateRound() - Update specific round              │
│  │                                                           │
│  ├─> StandingsDataProviderService (inferred)                │
│  │   └─> Update tournament standings                        │
│  │                                                           │
│  ├─> KnockoutsDataProviderService (inferred)                │
│  │   └─> Update knockout brackets                           │
│  │                                                           │
│  ├─> DataProviderExecution                                  │
│  │   ├─> Track execution lifecycle                          │
│  │   ├─> Record start/completion/failure                    │
│  │   └─> Send notifications                                 │
│  │                                                           │
│  └─> DataProviderReport                                     │
│      ├─> Generate execution reports                         │
│      ├─> Upload to S3                                       │
│      └─> Return summary metrics                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4. Data Processing Flow (Match Update Example)

```
┌────────────────────────────────────────────────────────────────┐
│          Match Update Processing Flow                          │
└────────────────────────────────────────────────────────────────┘

1. INITIALIZATION
   ├─> Create DataProviderExecution record (status: in_progress)
   ├─> Initialize DataProviderReport
   └─> Set tournament metadata

2. INPUT VALIDATION
   ├─> Validate tournament ID
   ├─> Validate round slug (if round-specific)
   └─> Log operation start

3. DATABASE FETCH
   ├─> Fetch tournament rounds from DB
   └─> Log rounds count

4. EXTERNAL DATA SCRAPING (Playwright)
   ├─> For each round:
   │   ├─> Navigate to SofaScore URL
   │   ├─> Extract page content (JSON data)
   │   ├─> Parse match events
   │   ├─> Transform to DB schema
   │   ├─> Sleep 2.5s (rate limiting)
   │   └─> Log operation (success/failure)
   └─> Aggregate all matches

5. DATABASE OPERATIONS
   ├─> Create/Update matches in PostgreSQL
   ├─> Update match statuses (open/ended/not-defined)
   ├─> Update scores (regular + penalties)
   └─> Log operation results

6. REPORT GENERATION
   ├─> Compile execution summary
   │   ├─> Operations count
   │   ├─> Success/failure counts
   │   └─> Match counts per round
   ├─> Create report file (JSON/Markdown)
   └─> Upload to AWS S3

7. EXECUTION COMPLETION
   ├─> Update execution record (status: completed/failed)
   ├─> Add report URLs
   ├─> Calculate duration
   └─> Send Slack notification

8. NOTIFICATION (Slack)
   ├─> Build formatted message
   │   ├─> Header (Success/Failure emoji)
   │   ├─> Tournament info
   │   ├─> Operation summary
   │   ├─> Error details (if failed)
   │   └─> Link to S3 report
   └─> POST to webhook
```

---

## Data Flow Sequences

### Sequence 1: Daily Schedule Creation

```
Time: 00:01 UTC Daily

EventBridge Scheduler
        │
        │ (cron: 1 0 * * ? *)
        ▼
caller-daily-routine Lambda
        │
        │ {
        │   "targetEnv": "demo",
        │   "endpoint": "https://api.../scheduler"
        │ }
        ▼
Express API (/api/v2/data-provider/scheduler)
        │
        │ [Internal Auth Check]
        ▼
SchedulerController (inferred)
        │
        ▼
        ├─> Query all tournaments
        ├─> Query today's matches
        ├─> For each match:
        │   └─> Create EventBridge Schedule
        │       ├─> Score update (match time + 90min)
        │       └─> Standings update (match time + 120min)
        ▼
Database
        └─> Log scheduling operations
```

### Sequence 2: Match Score Update

```
Time: Match end time + 90 minutes

EventBridge Schedule (Match-specific)
        │
        ▼
caller-scores-and-standings Lambda
        │
        │ {
        │   "tournamentId": "xyz",
        │   "roundSlug": "matchday-1"
        │ }
        ▼
Express API (/api/v2/data-provider/scheduler)
        │
        │ [Internal Auth Check]
        ▼
MatchesDataProviderService.updateRound()
        │
        ├─> Fetch round from DB
        ├─> Navigate to SofaScore (Playwright)
        ├─> Extract match data
        │   ├─> Match status (finished/postponed/open)
        │   ├─> Scores (home/away)
        │   └─> Penalty scores
        ├─> Transform data
        ├─> Update database
        │   └─> UPSERT matches
        ├─> Generate report
        ├─> Upload to S3
        └─> Notify Slack
```

### Sequence 3: Standings Recalculation (inferred)

```
Time: Match end time + 120 minutes

EventBridge Schedule
        │
        ▼
caller-scores-and-standings Lambda
        │
        ▼
Express API
        │
        ▼
StandingsDataProviderService (inferred)
        │
        ├─> Fetch all matches in tournament
        ├─> Calculate points per team
        │   ├─> Wins: 3 points
        │   ├─> Draws: 1 point
        │   └─> Losses: 0 points
        ├─> Calculate goal difference
        ├─> Sort teams by:
        │   1. Points
        │   2. Goal difference
        │   3. Goals scored
        ├─> Update standings table
        └─> Generate report
```

---

