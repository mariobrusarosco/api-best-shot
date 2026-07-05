# Phase 0

## Goal

Lock the V2 implementation boundary for `Update matches for a tournament` before writing runtime code.

This slice covers only:

1. the admin-triggered **update matches** workflow
2. one tournament at a time
3. SofaScore-backed round-event fetches through the shared V2 Playwright transport
4. upsert of local `match` rows for one tournament

It explicitly does **not** include round-specific update, single-match sync, current-round sync, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [x]

Rules:

1. This slice implements only the V2 equivalent of V1 `MatchesDataProviderService.updateMatches(...)`.
2. The active cutover target is:
   - `PATCH /api/v2/admin/tournaments/:tournamentId/matches`
3. Match Update is tournament-scoped and depends on:
   - stored tournament rounds
   - stored team rows
4. Match rows remain unique by:
   - `provider + externalId`

### Task 0.2 - Lock the explicit non-goals [x]

Non-goals for this slice:

1. round-specific update
2. single-match sync
3. matches create changes
4. rounds create/update changes
5. teams create/update changes
6. standings changes
7. scheduler or cron integration
8. changing the `match` schema
9. automatic creation of missing rounds or missing teams

## Decision Notes

### Update write-strategy choice

Three directions were considered:

1. exact V1 behavior
   - fetch all rounds and upsert all resolvable matches
   - chosen
2. update only already-existing matches
   - rejected because V1 can create newly discovered matches during update
3. split create-vs-update by provider response
   - rejected because the DB uniqueness rule already defines that boundary

This plan explicitly chooses **Option 1**.

Meaning:

1. Match Update may create newly discovered rows
2. Match Update may refresh already-existing rows
3. the report must distinguish `created_during_update` from `updated`

# Phase 1

## Goal

Extend the shared match contract surface for update semantics.

## Tasks

### Task 1.1 - Add Match Update contract types [x]

Edit:

```text
src/domains/data-provider-v2/contracts/matches.ts
```

Add:

1. update outcome vocabulary
2. update summary/details/report data
3. update workflow status/result/report types

# Phase 2

## Goal

Implement the core Match Update workflow without execution/report/Slack.

## Tasks

### Task 2.1 - Add update persistence helper [x]

Create:

```text
src/domains/data-provider-v2/persistence/match/upsert-matches.ts
```

### Task 2.2 - Add the update use-case [x]

Create:

```text
src/domains/data-provider-v2/use-cases/matches/run-tournament-matches-update.ts
```

Rules:

1. reuse stored-round loading and round-event preparation
2. if no stored rounds exist
   - return explicit prerequisite-failure workflow result
3. if no discovered matches exist after provider fetch
   - return explicit provider-missing workflow result
4. resolve local teams by `provider + externalId`
5. block matches whose teams are missing locally
6. upsert every fully resolvable discovered match
7. return raw workflow facts only

# Phase 3

## Goal

Wrap Match Update in the standard V2 operation envelope.

## Tasks

### Task 3.1 - Add execution lifecycle [x]

Create:

```text
src/domains/data-provider-v2/operations/matches-update/execution-job-store.ts
```

### Task 3.2 - Add report upload and Slack notification [x]

Create:

1. `operations/matches-update/report-uploader.ts`
2. `operations/matches-update/slack-notifier.ts`

### Task 3.3 - Add report builder and runner [x]

Create:

1. `operations/matches-update/report-builder.ts`
2. `operations/matches-update/tournament-operation-runner.ts`

# Phase 4

## Goal

Cut the admin update route over to V2.

## Tasks

### Task 4.1 - Replace the V1 update path in admin service [x]

Edit:

```text
src/domains/admin/services/matches.ts
```

The target route is:

```text
PATCH /api/v2/admin/tournaments/:tournamentId/matches
```

Rule:

1. keep round-specific update and single-match sync untouched

# Phase 5

## Goal

Verify the slice and document the cutover.

## Tasks

### Task 5.1 - Update V2 equivalence tracking [x]

Edit:

```text
src/domains/data-provider-v2/V1_EQUIVALENTS.md
```

### Task 5.2 - Verification [x]

Run:

1. targeted `yarn eslint`
2. `yarn compile`
