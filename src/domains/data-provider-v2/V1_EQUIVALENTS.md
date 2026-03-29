# V1 Equivalents

This document maps the V1 data-provider workflows that already have a real V2 equivalent.

It is intentionally small.

It is **not** a full migration checklist for every V1 capability.
It only tracks the V1 workflows we have already implemented in V2.

## Implemented Equivalents

| V1 workflow | V1 reference | V2 equivalent | Current state | Notes |
| --- | --- | --- | --- | --- |
| Open match sync (`matches.sync_ended`) | [matches-sync.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/matches-sync.ts) | [run-open-match-sync-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/open-match-sync/run-open-match-sync-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/open-match-sync/tournament-operation-runner.ts) | Implemented and active | Batch-scoped browser workspace, tournament-scoped execution/report/Slack |
| Standings create | [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts) `init()` | [run-tournament-standings-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/standings/run-tournament-standings-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace |
| Standings update | [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts) `update()` / `updateForTournamentIds()` | [run-standings-update-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/standings/run-standings-update-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-update/tournament-operation-runner.ts) | Implemented and active | Internal batch core accepts `tournamentIds: string[]`; single admin `PATCH` delegates with `[tournamentId]` |
| Teams create | [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts) `init()` | [run-tournament-teams-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/teams-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; tournament-scoped discovery creates missing global team rows |
| Teams update | [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts) `update()` | [run-tournament-teams-update.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-update.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/teams-update/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; tournament-scoped discovery refreshes existing global team rows and may create newly discovered rows during update |

## Current Admin / Scheduler Cutovers

These are the user-facing or scheduler-facing paths that already point to V2:

1. `matches.sync_ended`
   - V2 open-match sync batch
2. `POST /api/v2/admin/tournaments/:tournamentId/standings`
   - V2 standings create
3. `PATCH /api/v2/admin/tournaments/:tournamentId/standings`
   - V2 standings update
4. `POST /api/v2/admin/tournaments/:tournamentId/teams`
   - V2 teams create
5. `PATCH /api/v2/admin/tournaments/:tournamentId/teams`
   - V2 teams update

## Not Yet Mapped Here

These V1 areas are still outside the implemented-equivalents list in this document:

1. rounds create/update
2. matches create/update
3. tournament create/update flows outside the standings/open-match work
4. tournament current-round sync

## How To Use This File

Before starting a new data-provider V2 slice:

1. check whether the V1 workflow is already listed here
2. if it is listed, use the linked V2 equivalent as the reference implementation
3. if it is not listed, treat it as a new slice and create a plan first
