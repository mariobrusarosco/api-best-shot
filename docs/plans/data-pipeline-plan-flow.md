# Data Pipeline Plan Flow

## Overview

SCORES ARE CALCULATED BY LEAGUE.
A USER HAVE A SCORE FOR EACH LEAGUE.
IN THE FUTURE, WE COULD CALCULATE THE SCORE FOR ALL TOURNAMENTS FOR A USER, WHEN THAT USER ACCESS A SPECIFIC FRONT END PAGE

---

## System Architecture - Data Model

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│Tournament #1│  │Tournament #2│  │Tournament #3│  │Tournament #4│       │Tournament #1│  │Tournament #14│ │Tournament #20│ │Tournament #8│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │                      │                │                │                │
       └────────────────┴────────────────┴────────────────┘                      └────────────────┴────────────────┴────────────────┘
                                  │                                                               │
                         ┌────────┴────────┐                                            ┌────────┴────────┐
                         │   League #1     │                                            │   League #2     │
                         └────────┬────────┘                                            └────────┬────────┘
                                  │                                                               │
       ┌──────────────────────────┼──────────────────────────┐                 ┌─────────────────┼─────────────────────────┐
       │                          │                          │                 │                 │                         │
       │                          │                          │                 │                 │                         │
 ┌─────┴─────┐             ┌──────┴──────┐           ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐         ┌───────┴──────┐
 │  User #1  │             │   User #2   │           │   User #3   │   │  User #34   │   │   User #2   │         │  User #24    │
 └───────────┘             └─────────────┘           └─────────────┘   └─────────────┘   └─────────────┘         └──────────────┘
                                                      ┌─────────────┐                     ┌─────────────┐
                                                      │  User #4    │                     │  User #43   │
                                                      └─────────────┘                     └─────────────┘
```

---

## Daily Scheduling Flow

### Step 1: Daily Query (00:01 UTC)

```
┌──────────────┐
│ Date:        │
│ 3/02/2026    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│         At 00:01 (UTC)                       │
│                                              │
│  Query Database for ALL MATCHES of ALL       │
│  TOURNAMENTS that will start at 03/02/2026   │
└──────────────────┬───────────────────────────┘
                   │
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
```

### Step 2: Match Discovery & Job Scheduling

```
┌──────────────┐                                     ┌───────────────────────────────────────────────────────────┐
│Tournament #1 │                                     │  For each MATCH We'll schedule a cron job to happen 3+   │
└──────┬───────┘                                     │  hours of the MATCH START.                                │
       │                                             │                                                           │
       │                                             │  A) We're assuming the end of the match after 3 hours     │
       ├─────────────────────────────────────┐       │                                                           │
       │                                     │       │  B) If two matches of same tournament starts at the       │
       │                                     │       │     same time, we'll have a unique job                    │
       ▼                                     ▼       └───────────────────────────────────────────────────────────┘
┌─────────────┐                      ┌─────────────┐
│ MATCH #2352 │                      │ MATCH #2354 │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐        ┌─────────────┐
│ Start at    │                      │ Start at    │        │ MATCH #2355 │
│ 14:00 (UTC) │                      │ 15:00 (UTC) │        └─────────────┘
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│ scheduled       │                  │ scheduled       │
│ JOB #1          │                  │ JOB #2          │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────┐         ┌──────────────────────────────┐
│ Calls                    │         │ Calls                        │
│ /update-match?ids=2352   │         │ /update-match?ids=2354,2355  │
└──────────────────────────┘         └──────────────────────────────┘



┌──────────────┐
│Tournament #5 │
└──────┬───────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│ MATCH #4240 │                      │ MATCH #4360 │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│ Start at    │                      │ Start at    │
│ 15:00 (UTC) │                      │ 17:00 (UTC) │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│ scheduled       │                  │ scheduled       │
│ JOB #3          │                  │ JOB #4          │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│ Calls                    │         │ Calls                    │
│ /update-match?ids=4240   │         │ /update-match?ids=4360   │
└──────────────────────────┘         └──────────────────────────┘
```

---

## Timeline & Action Execution

```
Timeline:  17:00 (UTC)    18:00 (UTC)    19:00 (UTC)    20:00 (UTC)
              │               │              │              │
              │               │              │              │
              ▼               ▼              ▼              ▼
          ┌───A───┐       ┌───A───┐                    ┌───A───┐
          │       │       │       │                    │       │
          └───────┘       └───────┘                    └───────┘
```

---

## Action Flow (A)

### When a Scheduled Job Executes:

```
┌─────────────────────────────────────────────────────────────────┐
│                         ⓐ  ACTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SCRAP DATA FOR THE ROUND_ID OF MATCH                       │
│                                                                 │
│  2. IDENTIFY THE TOURNAMENT_ID OF THAT MATCH                   │
│                                                                 │
│  3. IDENTIFY THE LEAGUES_IDS THAT CONTAIN THAT TOURNAMENT_ID   │
│                                                                 │
│  4. MARK THAT LEAGUE AS "PARTICIPANTS_SCORES": "outdata"       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Score Calculation & Front-End Display Flow

### Parallel Processing Flow:

```
┌──────────────────────────────────────────────────┐
│  CALCULATE THE SCORES, FOR THE USERS FROM        │
│  LEAGUE 2                                        │
└────────────────────┬─────────────────────────────┘
                     │
                     │ (Background Processing)
                     │
     ┌───────────────┼───────────────┬──────────────────────┐
     │               │               │                      │
     ▼               ▼               ▼                      ▼
  20:05 UTC       20:15 UTC       20:22 UTC
     │               │               │
     │               │               │
┌────┴────┐     ┌────┴────┐     ┌────┴────┐
│User #99 │     │User #10 │     │User #99 │
│accesses │     │accesses │     │accesses │
│League #2│     │League #2│     │League #2│
│on Front │     │on Front │     │on Front │
│End App  │     │End App  │     │End App  │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     ▼               ▼               ▼

Front end        The score      Front end
will display:    calculation    will display:
                 is done
┌──────────┐                    ┌──────────┐
│partici-  │    Front end       │partici-  │
│pants_    │    will display:   │pants_    │
│scores    │                    │scores    │
└──────────┘    ┌──────────┐    └──────────┘
                │partici-  │
┌──────────┐    │pants_    │    ┌──────────┐
│syncing..│     │scores    │    │up-to-date│
└──────────┘    └──────────┘    └──────────┘

                ┌──────────┐
                │up-to-date│
                └──────────┘
```

---

## Key Insights

### Scheduling Strategy
- **Daily Batch**: At 00:01 UTC, system queries all matches for the current date
- **Individual Jobs**: Each match gets a scheduled job to execute 3+ hours after match start
- **Job Consolidation**: Multiple matches starting at the same time in the same tournament share a single job
- **API Calls**: Jobs call `/update-match?ids=X,Y,Z` with comma-separated match IDs

### Score Calculation
- **League-Based**: Scores are calculated per league, not per tournament
- **Asynchronous**: Score calculation happens in the background
- **State Management**: Leagues are marked with status:
  - `"outdata"` - Needs recalculation
  - `"syncing"` - Calculation in progress
  - `"up-to-date"` - Scores are current

### Data Flow
1. Match data scraped from external source
2. Tournament identified
3. All leagues containing that tournament are flagged
4. Score recalculation triggered for affected leagues
5. Front-end displays real-time status to users

### Future Enhancement
- Could calculate scores for ALL tournaments when a user accesses a specific front-end page
- Current implementation: Per-league calculation only
