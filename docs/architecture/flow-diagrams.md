# API Best Shot - Architecture Flow Diagrams

This document provides a visual representation of the Best Shot API flows using the standard project diagramming style.

## 1. Global Request & Layer Flow
Illustrates the path of a request through the three layers, including cross-domain orchestration.

```text
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request (v1/v2)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                             │
│   • AuthAPI • LeagueAPI • TournamentAPI • GuessAPI          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                           │
│  ┌────────────────┐         ┌─────────────────────────┐     │
│  │ Domain Service │◄───────►│ Cross-Domain Service    │     │
│  │ (e.g. League)  │         │ (e.g. Member/Auth)      │     │
│  └───────┬────────┘         └─────────────────────────┘     │
└──────────┼──────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      QUERY LAYER                            │
│  • Drizzle ORM Queries (QUERIES_DOMAIN)                     │
│  • Raw Data Retrieval & Persistence                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 POSTGRESQL DATABASE                         │
│  • T_Member • T_League • T_Tournament • T_Match • T_Guess   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Core User Journey (Scoring Logic)
How the system handles the unique scoring logic where points are calculated dynamically on-demand.

```text
┌─────────────────────────────────────────────────────────────┐
│             GET /api/v2/tournaments/:id/score               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Tournament API / Service                      │
│  1. Get Authenticated Member ID                             │
│  2. Fetch Member's Guesses via QUERIES_TOURNAMENT           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Guess Analysis Engine                        │
│  3. Loop through each Guess + Match pair                    │
│  4. Run 'runGuessAnalysis(guess, match)'                    │
│  5. Compare Prediction vs. Reality (Live/Final scores)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Dynamic Response                         │
│  • Calculate Total Points (reduce analysis results)         │
│  • Return Points + Analysis Details to UI                   │
└─────────────────────────────────────────────────────────────┘
```

## 3. The Scheduler (Background Pipeline)
How the API stays synchronized with real-world football matches via polling and scraping.

```text
┌─────────────────────────────────────────────────────────────┐
│                   Scheduler Cron Job                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Match Polling Service                       │
│  • Find 'open' matches started > 2 hours ago                │
│  • Skip matches checked in last 10 minutes                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Match Update Orchestrator                     │
│  • For each match: Execute Playwright Scraper               │
│  • Update T_Match score and status ('ended')                │
│  • Mark match as 'lastCheckedAt = NOW()'                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Standings Integration                        │
│  • If a match status changed to 'ended':                    │
│  • Trigger Standings Scraper for that Tournament            │
└─────────────────────────────────────────────────────────────┘
```

## Key Findings

1. **Calculated points**: Points are NEVER stored in the `T_Guess` table. They are computed in memory during the score request.
2. **Setup Pre-population**: Joining a tournament creates all necessary guess records with NULL values immediately.
3. **Reactive Standings**: Standings updates are "lazy" and only triggered by the end of a match within that tournament.
