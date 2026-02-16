# Session Handoff - Leaderboard System Design V1

Date: 2026-02-16  
Project: `api-best-shot`

## 1. Goal Of This Session

Design and start implementing a reliable leaderboard settlement flow for finished matches only.

Mantra used:

1. Decide one thing.
2. Implement one thing.
3. Validate one thing.

## 2. Agreed Product Rules (V1)

1. We settle points only when a match is finished (`provider: finished` -> internal `ended`).
2. We group only matches that finish at the exact same time.
3. Ranking mode is dense (`1, 1, 2`).
4. Provider polling every 5 minutes is acceptable.
5. Tournament leaderboard is the main source; league score can be derived from tournament points.

## 3. System Design Doc In Progress

Main design draft is here:

- `docs/architecture/system-design-v1.md`

It already includes:

1. High-level architecture diagram.
2. Finished-match settlement flow.
3. Redis cache strategy.
4. Contracts section (job payload, idempotency intent, retry + DLQ policy, read contracts).
5. Failure scenarios table.

## 4. Code Implemented In This Session

### 4.1 Detect match transition to `ended` during provider updates

- `src/domains/data-provider/services/match.ts:456`
- `src/domains/match/queries/index.ts:187`

What was added:

1. Read previous match statuses by `(provider, externalId)` before upsert.
2. Upsert incoming matches.
3. Select only matches that transitioned to `ended` (`previous !== ended && current === ended`).

### 4.2 Settlement orchestration service

- `src/domains/score/services/settlement.service.ts:1`

What it does:

1. For each transitioned match, calculate points delta.
2. Apply score updates to Postgres + Redis master scoreboard.
3. Refresh league leaderboards for active leagues linked to the tournament.

### 4.3 Query to find active leagues per tournament

- `src/domains/league/queries/index.ts:100`

What was added:

1. `getActiveLeagueIdsByTournament(tournamentId)` query.

## 5. Validation Performed

Command run:

- `yarn compile`

Result:

1. Compile passed after changes.

## 6. Current Gap (Important)

Settlement currently runs inline in ingestion update flow.  
That means we still need async resilience features for production-grade behavior.

Missing hardening:

1. Queue-backed settlement (`match_finished` job).
2. Retries with backoff.
3. DLQ on max retries.
4. Strong idempotency persistence (to avoid double-apply on replay/crash).

## 7. Suggested Next Session (Mantra)

### Decide one thing

Use queue worker for settlement instead of inline processing.

### Implement one thing

1. Enqueue `match_finished` jobs from match update flow.
2. Add settlement worker consuming those jobs.
3. Add retry/backoff and DLQ handling.

### Validate one thing

1. Integration test: `open -> ended` updates points once.
2. Replay same event and confirm no double-scoring.

## 8. Quick Resume Commands

```bash
git status --short
git diff -- docs/architecture/system-design-v1.md
git diff -- src/domains/data-provider/services/match.ts
git diff -- src/domains/score/services/settlement.service.ts
git diff -- src/domains/match/queries/index.ts
git diff -- src/domains/league/queries/index.ts
```

