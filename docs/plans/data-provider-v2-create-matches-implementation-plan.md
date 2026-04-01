# Phase 0

## Goal

Lock the V2 implementation boundary for `Create matches for a tournament` before writing runtime code.

This slice covers only:

1. the admin-triggered **create matches** workflow
2. one tournament at a time
3. SofaScore-backed round-event fetches through the shared V2 Playwright transport
4. insertion of missing local `match` rows for one tournament

It explicitly does **not** include matches update, single-match sync, current-round sync, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [x]

Rules:

1. This slice implements only the V2 equivalent of V1 `MatchesDataProviderService.init(...)`.
2. The active cutover target is:
   - `POST /api/v2/admin/tournaments/:tournamentId/matches`
3. Match Create is tournament-scoped and depends on:
   - stored tournament rounds
   - stored team rows
4. Match rows remain unique by:
   - `provider + externalId`

### Task 0.2 - Lock the ownership boundaries [x]

Stable ownership for this slice:

1. `transport/`
   - reuse the shared V2 Playwright runtime/session path
2. `providers/sofascore/`
   - reuse the existing round provider for round-event fetches
3. `use-cases/matches/`
   - fetch round-event payloads for stored rounds
   - map provider events into discovered match candidates
   - classify existing local matches
   - resolve local team IDs by provider external IDs
   - insert only creatable missing matches
   - return raw workflow facts
4. `persistence/match/`
   - list existing matches by `provider + externalId`
   - list local teams by `provider + externalId`
   - insert missing match rows
5. `operations/matches-create/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [x]

Non-goals for this slice:

1. matches update
2. single-round match update
3. single-match sync
4. rounds create/update changes
5. teams create/update changes
6. standings changes
7. scheduler or cron integration
8. changing the `match` schema
9. automatic creation of missing rounds or missing teams
10. building a generic “match sync engine”

## Decision Notes

### Prerequisite choice

Three directions were considered:

1. silently skip when rounds or teams are missing
   - rejected
2. auto-trigger or auto-fetch other workflows to create missing rounds/teams
   - rejected
3. treat stored rounds and stored teams as explicit prerequisites, while still creating any matches that are fully resolvable
   - chosen

This plan explicitly chooses **Option 3**.

Meaning:

1. if the tournament has no stored rounds
   - workflow fails clearly
2. if provider rounds return matches but some referenced teams do not exist locally
   - those matches are blocked and reported
   - any fully resolvable matches may still be created

### Create write-strategy choice

Three directions were considered:

1. exact V1 behavior
   - plain insert of all enriched matches
   - rejected because it can fail noisily on reruns
2. classify existing matches first, then insert only missing ones
   - chosen
3. upsert all matches in create
   - rejected because it collapses create and update semantics too early

### Browser-lifetime rule

This workflow is single-operation, not batch-driven.

So the browser lifetime rule is:

```text
one matches-create operation
-> one runtime/browser
-> one session/context/page
-> provider fetches for stored rounds
-> close once at the end
```

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   └── matches.ts
├── persistence/
│   └── match/
│       ├── insert-matches.ts
│       ├── list-matches-by-external-id.ts
│       └── list-resolved-teams-by-external-id.ts
├── operations/
│   └── matches-create/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── matches/
        ├── map-provider-matches.ts
        ├── prepare-tournament-matches.ts
        └── run-tournament-matches-create.ts
```

This slice may also edit:

```text
src/domains/admin/services/matches.ts
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
src/domains/data-provider-v2/V1_EQUIVALENTS.md
```

# Phase 1

## Goal

Freeze the shared match-create contract surface before runtime code exists.

## Tasks

### Task 1.1 - Define the shared matches contract [x]

Create:

```text
src/domains/data-provider-v2/contracts/matches.ts
```

This contract should define:

1. tournament context used by Match Create
2. stored round context used by Match Create
3. provider event payload types needed by Match Create
4. mapped match candidate shape
5. prerequisite/provider/invalid/team-blocked failure shapes
6. create-matches summary contract
7. create-matches detail contract
8. create-matches workflow status
9. create-matches workflow result
10. create-matches report upload result

# Phase 2

## Goal

Implement the core Match Create workflow without execution/report/Slack.

## Tasks

### Task 2.1 - Add match persistence helpers [x]

Create:

1. `persistence/match/list-matches-by-external-id.ts`
2. `persistence/match/list-resolved-teams-by-external-id.ts`
3. `persistence/match/insert-matches.ts`

### Task 2.2 - Add provider mapping and preparation [x]

Create:

1. `use-cases/matches/map-provider-matches.ts`
2. `use-cases/matches/prepare-tournament-matches.ts`

Rules:

1. fetch round-event payloads only from stored rounds
2. map provider events into local match candidates
3. classify per-round provider issues
4. classify invalid provider matches
5. dedupe discovered matches by `externalId`

### Task 2.3 - Add the create use-case [x]

Create:

```text
use-cases/matches/run-tournament-matches-create.ts
```

Rules:

1. if no stored rounds exist
   - return explicit prerequisite-failure workflow result
2. if no discovered matches exist after provider fetch
   - return explicit provider-missing workflow result
3. list existing matches by `provider + externalId`
4. resolve local teams by `provider + externalId`
5. block matches whose teams are missing locally
6. insert only fully resolvable missing matches
7. return raw workflow facts only

# Phase 3

## Goal

Wrap Match Create in the standard V2 operation envelope.

## Tasks

### Task 3.1 - Add execution lifecycle [x]

Create:

```text
operations/matches-create/execution-job-store.ts
```

### Task 3.2 - Add report upload and Slack notification [x]

Create:

1. `operations/matches-create/report-uploader.ts`
2. `operations/matches-create/slack-notifier.ts`

These should reuse the shared V2 helpers already extracted.

### Task 3.3 - Add report builder and runner [x]

Create:

1. `operations/matches-create/report-builder.ts`
2. `operations/matches-create/tournament-operation-runner.ts`

Rule:

1. use-case returns raw workflow facts
2. `report-builder.ts` shapes `summary/details/data/status`
3. runner owns execution/report upload/finalization/Slack

# Phase 4

## Goal

Cut the admin create route over to V2.

## Tasks

### Task 4.1 - Replace the V1 create path in admin service [x]

Edit:

```text
src/domains/admin/services/matches.ts
```

The target route is:

```text
POST /api/v2/admin/tournaments/:tournamentId/matches
```

Rules:

1. validate tournament existence
2. validate provider support
3. build `MatchesTournamentContext`
4. call the V2 Match Create runner
5. keep success response stable:
   - `201`
   - `success: true`
   - `data: { matches }`
6. return `422` when the workflow does not complete

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

### Task 5.3 - Manual expectations [ ]

Expected admin order after this cutover:

1. Tournament
2. Rounds
3. Teams
4. Matches
