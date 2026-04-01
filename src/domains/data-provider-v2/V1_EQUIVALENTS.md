# V1 Equivalents

This document maps the V1 data-provider workflows that already have a real V2 equivalent.

It is intentionally small.

It is **not** a full migration checklist for every V1 capability.
It only tracks the V1 workflows we have already implemented in V2.

## Implemented Equivalents

| V1 workflow | V1 reference | V2 equivalent | Current state | Notes |
| --- | --- | --- | --- | --- |
| Open match sync (`matches.sync_ended`) | [matches-sync.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/matches-sync.ts) | [run-open-match-sync-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/open-match-sync/run-open-match-sync-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/open-match-sync/tournament-operation-runner.ts) | Implemented and active | Batch-scoped browser workspace, tournament-scoped execution/report/Slack |
| Tournament create | [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts) `init()` | [run-tournament-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/tournament/run-tournament-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/tournament-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; admin tournament create is on V2 |
| Tournament update | [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts) `updateOnDatabase()` | [run-tournament-update.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/tournament/run-tournament-update.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/tournament-update/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; admin tournament update is on V2 |
| Standings create | [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts) `init()` | [run-tournament-standings-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/standings/run-tournament-standings-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace |
| Standings update | [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts) `update()` / `updateForTournamentIds()` | [run-standings-update-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/standings/run-standings-update-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-update/tournament-operation-runner.ts) | Implemented and active | Internal batch core accepts `tournamentIds: string[]`; single admin `PATCH` delegates with `[tournamentId]` |
| Rounds create | [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts) `init()` | [run-tournament-rounds-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/rounds-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; fetches full `/rounds` and persists every normalized round regardless of tournament mode |
| Rounds update | [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts) `update()` | [run-tournament-rounds-update.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-update.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/rounds-update/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; refreshes the full `/rounds` payload and upserts season and knockout rounds in one pass |
| Teams create | [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts) `init()` | [run-tournament-teams-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/teams-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; tournament-scoped discovery creates missing global team rows |
| Teams update | [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts) `update()` | [run-tournament-teams-update.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-update.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/teams-update/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; tournament-scoped discovery refreshes existing global team rows and may create newly discovered rows during update |
| Matches create | [match.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/match.ts) `init()` | [run-tournament-matches-create.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/matches/run-tournament-matches-create.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/matches-create/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; requires stored rounds and stored teams, then creates only fully resolvable missing matches |
| Matches update | [match.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/match.ts) `updateMatches()` | [run-tournament-matches-update.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/matches/run-tournament-matches-update.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/matches-update/tournament-operation-runner.ts) | Implemented and active | Single-operation browser workspace; requires stored rounds and stored teams, then upserts every fully resolvable discovered match |
| Tournament current-round sync (`tournaments.current_round_sync`) | [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts) `syncCurrentRound()` / `syncCurrentRoundsForTournamentIds()` | [run-current-round-sync-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/current-round-sync/run-current-round-sync-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/current-round-sync/tournament-operation-runner.ts) | Implemented and active | Internal batch core accepts `tournamentIds: string[]`; cron target delegates with today's unique tournament ids while keeping tournament-scoped execution/report/Slack |
| Tournament knockout-rounds sync (`tournaments.knockout_rounds_sync`) | [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts) `updateKnockouts()` / `updateKnockoutsForTournament()` | [run-knockout-rounds-sync-batch.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/use-cases/knockout-rounds-sync/run-knockout-rounds-sync-batch.ts) and [tournament-operation-runner.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/knockout-rounds-sync/tournament-operation-runner.ts) | Implemented and active | Batch-scoped browser workspace; only persists newly discovered knockout rounds once their round-events endpoint is live, then creates matches for those new rounds only |

## Current Admin / Scheduler Cutovers

These are the user-facing or scheduler-facing paths that already point to V2:

1. `POST /api/v2/admin/tournaments`
   - V2 tournament create
2. `PATCH /api/v2/admin/tournaments/:tournamentId`
   - V2 tournament update
3. `matches.sync_ended`
   - V2 open-match sync batch
4. `POST /api/v2/admin/tournaments/:tournamentId/standings`
   - V2 standings create
5. `PATCH /api/v2/admin/tournaments/:tournamentId/standings`
   - V2 standings update
6. `POST /api/v2/admin/tournaments/:tournamentId/teams`
   - V2 teams create
7. `PATCH /api/v2/admin/tournaments/:tournamentId/teams`
   - V2 teams update
8. `POST /api/v2/admin/tournaments/:tournamentId/rounds`
   - V2 rounds create
9. `PATCH /api/v2/admin/tournaments/:tournamentId/rounds`
   - V2 rounds update
10. `POST /api/v2/admin/tournaments/:tournamentId/matches`
   - V2 matches create
11. `PATCH /api/v2/admin/tournaments/:tournamentId/matches`
   - V2 matches update
12. `tournaments.current_round_sync`
   - V2 current-round sync batch
13. `tournaments.knockout_rounds_sync`
   - V2 knockout-rounds sync batch

## Not Yet Mapped Here

There are no remaining V1 workflows in the current migration scope.

## Intentionally Out Of Scope For This File

These paths still exist, but they are not part of the current V2 migration target tracked here:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/rounds/:roundSlug/matches`
2. `PATCH /api/v2/admin/matches/:matchId/sync`

## Notes

1. `matches.sync_ended` is the active V2 replacement for the old open-match polling workflow.
2. The cron target name is still historical and can be renamed later without changing the current V2 cutover picture.

## How To Use This File

Before starting a new data-provider V2 slice:

1. check whether the V1 workflow is already listed here
2. if it is listed, use the linked V2 equivalent as the reference implementation
3. if it is not listed, treat it as a new slice and create a plan first
