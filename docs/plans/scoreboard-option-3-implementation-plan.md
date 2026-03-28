# Scoreboard Option 3 Implementation Plan

Status: Draft  
Date: March 25, 2026  
Owner: Backend / Platform  
Scope: Tournament scoreboard and league scoreboard using a ledger + tournament aggregate model.

## Goal

Build the first durable scoreboard system for Best Shot using:

1. Existing per-guess scoring logic as the single scoring truth.
2. A durable per-match-per-member score ledger for auditability and idempotency.
3. A materialized tournament aggregate for fast reads.
4. League totals derived from tournament aggregates, not separately persisted.
5. The existing cron platform as the processor trigger.

## Decision Log (Locked)

1. Choose **Option 3**:
   - persist score applications in a ledger
   - materialize tournament totals into `tournament_scoreboard.points`
2. Keep `runGuessAnalysis(...)` as the scoring truth.
3. Treat the database, not the queue payload, as the durable scoreboard backlog.
4. A match is pending scoreboard application when:
   - `match.status = 'ended'`
   - and `match.scoreboardAppliedAt IS NULL`
5. Match sync does **not** calculate scoreboard totals.
   - It only changes match state and therefore creates scoreboard work.
6. Scoreboard processing is triggered by a dedicated recurring cron target:
   - `scoreboard.apply_pending_tournaments`
7. One tournament can only have one scoreboard execution running at a time.
8. The first implementation uses **Option B1: loop-before-release**:
   - when a tournament execution starts, it keeps draining that tournament backlog until the DB says the backlog is empty
9. Do not persist league totals in the first implementation.
   - league totals are computed from tournament aggregates on read
10. Do not introduce a new queue platform in the first implementation.

- use the existing cron platform and DB-backed backlog rule

## Phase 0 - Architecture Boundary

### Task 0.1 - Lock the persisted state [x]

The scoreboard system will use three kinds of persisted state.

#### A. Match backlog marker

The match table must expose whether scoreboard application has already happened.

Required field:

1. `match.scoreboardAppliedAt: timestamp | null`

Meaning:

1. `NULL` means:
   - this ended match still has scoreboard work pending
2. non-null means:
   - the match contribution has already been applied

Optional future field:

1. `match.scoreboardRuleVersionApplied`

This is not required for the first implementation, but it may become useful if score rules evolve.

#### B. Score ledger

Add a dedicated scoreboard ledger table.

Purpose:

1. Persist the exact score contribution for one member from one match.
2. Provide auditability and idempotency.
3. Explain why a tournament total has its current value.

Required minimum shape:

1. `id`
2. `matchId`
3. `tournamentId`
4. `memberId`
5. `guessId`
6. `pointsEarned`
7. `ruleVersion`
8. `createdAt`

Required uniqueness rule:

```text
one ledger row per (matchId, memberId, ruleVersion)
```

Meaning:

1. the same member/match contribution cannot be applied twice for the same scoring rule version

#### C. Tournament aggregate

Use the existing table:

1. [schema/index.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/tournament/schema/index.ts)
   - `tournament_scoreboard.points`

Meaning:

1. this is the fast tournament scoreboard read model
2. it is updated from the ledger application flow

#### D. Scoreboard execution tracking

Add a dedicated scoreboard execution/report persistence layer, modeled after the proven execution/report pattern already used in data-provider V2.

Purpose:

1. one execution record per tournament processing attempt
2. store status, timings, counts, and failures
3. provide admin/debug/report visibility

Important distinction:

1. **Cron run**
   - one execution of the recurring target `scoreboard.apply_pending_tournaments`
2. **Scoreboard execution**
   - one tournament-scoped processing attempt inside that cron run

### Task 0.2 - Lock the trigger model [x]

The trigger model must be explicit and mechanical.

#### A. Who creates scoreboard work?

Match sync creates scoreboard work indirectly.

Flow:

1. `matches.sync_ended` runs
2. open-match sync updates one or more matches to `status = 'ended'`
3. those matches remain with `scoreboardAppliedAt = NULL`
4. the DB now says scoreboard work exists

Important rule:

1. match sync is the **detector**
2. scoreboard is a separate **processor**

#### B. Who starts processing?

The existing cron platform starts processing.

Add a recurring cron target:

```text
scoreboard.apply_pending_tournaments
```

This target does:

1. query the DB for tournaments that currently have pending scoreboard matches
2. attempt to start tournament-scoped scoreboard executions for those tournaments

Important rule:

1. there is no magic wake-up
2. there is an explicit recurring cron definition

#### C. What is the backlog truth?

The backlog lives in the DB.

Canonical rule:

```text
pending scoreboard match
= match.status = 'ended'
  AND match.scoreboardAppliedAt IS NULL
```

This is the durable source of truth.

Queue payloads or in-memory worker state are not the source of truth.

### Task 0.3 - Lock the execution contract [x]

The scoreboard system needs one tournament-scoped execution contract.

#### A. Unit of ownership

One scoreboard execution owns:

1. one tournament
2. one tournament lock
3. one processing window from start until the tournament backlog is empty or the execution fails

#### B. Worker behavior

Chosen model: **Option B1 - loop-before-release**

Mechanically:

1. cron target finds eligible tournament `ABC`
2. create scoreboard execution for tournament `ABC`
3. acquire tournament lock for `ABC`
4. query pending matches for `ABC`
5. process those matches
6. query pending matches for `ABC` again before releasing the lock
7. if new matches are now pending, keep going
8. stop only when the DB says the backlog for `ABC` is empty

Important rule:

1. the execution does not need to predict future matches
2. it only drains the currently known DB backlog

#### C. Per-match application semantics

Each pending ended match is applied one by one in deterministic order.

Per match:

1. load guesses for that match
2. score each guess with `runGuessAnalysis(...)`
3. write ledger rows
4. update `tournament_scoreboard.points`
5. mark `match.scoreboardAppliedAt`

Required transactional rule:

For one match, the following must be atomic:

1. ledger writes
2. tournament aggregate updates
3. `scoreboardAppliedAt` update

If the transaction fails:

1. none of them commit
2. the match remains pending

#### D. Stop condition

An execution stops when one of these is true:

1. the tournament backlog is empty
2. the execution fails
3. an explicit runtime limit is reached and the execution exits cleanly, leaving remaining matches pending

### Task 0.4 - Lock the read model contract [x]

#### A. Tournament reads

Tournament score reads must use the materialized aggregate.

Primary source:

1. `tournament_scoreboard.points`

Optional detail source:

1. ledger rows, only when a detailed explanation is needed

#### B. League reads

League totals are derived from tournament aggregates.

Meaning:

1. league includes tournaments through `league_tournament`
2. backend loads member tournament totals from `tournament_scoreboard`
3. backend or frontend sums them per member

Locked first implementation choice:

1. do not persist league totals

#### C. Under-calculation state

Tournament under-calculation state must not be a naive manual toggle.

It should be derived from durable conditions such as:

1. a running scoreboard execution for that tournament
2. or pending ended matches for that tournament

League under-calculation state is derived from its included tournaments.

### Task 0.5 - Lock the non-goals [x]

The first scoreboard implementation will **not** do these things:

1. no full tournament recomputation after every ended match
2. no persisted league scoreboard totals
3. no new queue infrastructure
4. no webhook/event-stream dependency
5. no exact real-time promise tied to real-world match ending time
6. no score-rule redesign in the same slice
7. no UI redesign in the same slice

## Phase 1 - Schema And Persistence

### Task 1 - Add backlog marker to match [x]

#### Task 1.1 - Add `scoreboardAppliedAt` to `match` schema [x]

#### Task 1.2 - Generate migration with Drizzle workflow (`yarn db:generate`) [x]

#### Task 1.3 - Apply migration and verify index/typing exposure [x]

### Task 2 - Add scoreboard ledger schema [x]

#### Task 2.1 - Create `scoreboard_ledger` schema [x]

#### Task 2.2 - Add uniqueness constraint for `(matchId, memberId, ruleVersion)` [x]

#### Task 2.3 - Add query helpers for ledger inserts and conflict-safe checks [x]

### Task 3 - Add scoreboard execution schema [x]

#### Task 3.1 - Create scoreboard execution table(s) [x]

#### Task 3.2 - Add query helpers to create, update, and fetch executions [x]

#### Task 3.3 - Define summary and report fields for per-tournament runs [x]

### Task 4 - Prepare tournament aggregate writes [x]

#### Task 4.1 - Add helper to upsert missing `tournament_scoreboard` rows [x]

#### Task 4.2 - Reuse or adapt bulk points update helpers [x]

## Phase 2 - Processing Contract

### Task 1 - Add scoreboard cron target [x]

#### Task 1.1 - Add `scoreboard.apply_pending_tournaments` to cron constants and registry [x]

#### Task 1.2 - Implement handler that discovers eligible tournaments [x]

#### Task 1.3 - Ensure handler respects tournament-level lock rules [x]

### Task 2 - Implement tournament execution runner [ ]

#### Task 2.1 - Create one tournament execution record [x]

#### Task 2.2 - Acquire tournament lock [x]

#### Task 2.3 - Loop until tournament backlog is empty or execution fails [x]

#### Task 2.4 - Persist success/failure summary and report [ ]

##### Task 2.4.1 - Define the runner-to-match-processor result contract [x]
- decide exactly what `processPendingMatch(...)` returns so the runner can aggregate summary data without owning Task 3 internals
- keep this focused on per-match metrics and IDs only

##### Task 2.4.2 - Extract scoreboard summary/report builders out of the runner [x]
- build the tournament summary from per-match results
- build report `details` and `data`
- keep aggregation helpers out of `tournament-runner.ts`

##### Task 2.4.3 - Add a scoreboard report uploader [x]
- create a scoreboard-specific report uploader
- keep S3/report-upload concerns out of `tournament-runner.ts`

##### Task 2.4.4 - Extend execution finalization helpers for report persistence [ ]
- allow `completed`, `partial_failure`, and `failed` finalization to persist:
  - summary
  - report file key
  - report file URL

##### Task 2.4.5 - Wire the runner to use the extracted helpers [ ]
- keep `tournament-runner.ts` responsible only for:
  - lock + loop
  - calling `processPendingMatch(...)`
  - delegating summary/report/finalization work to helpers

##### Task 2.4.6 - Add the minimal failure-path logging for persisted reports [ ]
- log finalize/report-upload failures without hiding the original execution error

### Task 3 - Implement per-match application [ ]

#### Task 3.1 - Load match guesses [ ]

#### Task 3.2 - Score guesses with `runGuessAnalysis(...)` [ ]

#### Task 3.3 - Insert ledger rows transactionally [ ]

#### Task 3.4 - Update tournament aggregate transactionally [ ]

#### Task 3.5 - Mark `scoreboardAppliedAt` transactionally [ ]

## Phase 3 - Read Models

### Task 1 - Tournament score reads [ ]

#### Task 1.1 - Read member tournament score from `tournament_scoreboard.points` [ ]

#### Task 1.2 - Return tournament under-calculation status [ ]

#### Task 1.3 - Keep per-guess detail paths separate from tournament total reads [ ]

### Task 2 - League score reads [ ]

#### Task 2.1 - Load active league tournaments [ ]

#### Task 2.2 - Sum member tournament totals across included tournaments [ ]

#### Task 2.3 - Return league under-calculation status derived from tournament states [ ]

## Phase 4 - Rollout Safety

### Task 1 - Backfill and recovery [ ]

#### Task 1.1 - Define how existing ended matches enter the backlog [ ]

#### Task 1.2 - Add recovery path for failed or partial executions [ ]

#### Task 1.3 - Verify idempotency against duplicate cron runs or retries [ ]

### Task 2 - Verification [ ]

#### Task 2.1 - Test one ended match with low volume [ ]

#### Task 2.2 - Test many guesses on one match [ ]

#### Task 2.3 - Test multiple ended matches discovered across multiple match-sync runs [ ]

#### Task 2.4 - Test league totals derived from multiple tournaments [ ]

## Expected Result

At the end of this implementation:

1. every ended match can be applied exactly once to the scoreboard
2. tournament totals are fast to read
3. league totals can be derived from tournament totals
4. failures are recoverable because backlog truth stays in the DB
5. per-match score contributions are auditable through the ledger
