# Phase 0

## Goal

Lock the V2 implementation boundary for `Create rounds for a tournament` before writing runtime code.

This slice is intentionally narrow.

It covers only:

1. the admin-triggered **create rounds** workflow
2. one tournament at a time
3. SofaScore-backed round discovery through the shared V2 Playwright transport
4. persistence of the full `/rounds` payload for one tournament

It explicitly does **not** include knockout-round discovery orchestration, matches sync, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [x]

Rules:

1. This slice implements only the V2 equivalent of V1 `RoundsDataProviderService.init(...)`.
2. The active cutover target is:
   - `POST /api/v2/admin/tournaments/:tournamentId/rounds`
3. Round discovery always uses the tournament `/rounds` endpoint.
4. Tournament mode does **not** change the create workflow shape.
5. Persisted round rows remain tournament-scoped by:
   - `tournamentId + slug`
6. This slice is manual/admin-triggered, not batch/scheduler-triggered.

### Task 0.2 - Lock the ownership boundaries [x]

Stable ownership for this slice:

1. `transport/`
   - reuse the shared V2 Playwright runtime/session path
2. `providers/sofascore/`
   - extend the shared round provider to fetch the tournament `/rounds` payload
3. `use-cases/rounds/`
   - fetch provider rounds
   - normalize provider rows
   - classify existing local rounds
   - upsert tournament round rows
   - return raw workflow facts
4. `persistence/tournament-round/`
   - list existing rounds for one tournament
   - upsert normalized rounds
5. `operations/rounds-create/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [x]

Non-goals for this slice:

1. rounds update
2. knockout-round discovery orchestration
3. matches create/update
4. teams or standings changes
5. tournament current-round sync
6. scheduler or cron integration
7. changing the `tournament_round` schema
8. building a generic cross-workflow rounds engine

## Decision Notes

### Generic rounds rule

The create workflow uses one stable rule for all tournament modes:

```text
fetch /rounds
-> normalize every provider round
-> upsert the normalized round rows
```

Meaning:

1. `regular-season-only`
   - season rounds only
2. `regular-season-and-knockout`
   - season rounds plus knockout rounds in one pass
3. `knockout-only`
   - knockout rounds only

### Create write strategy

V1 create already uses upsert semantics under the hood.

V2 keeps that durability choice, but still distinguishes:

1. newly created rounds
2. already-existing rounds encountered during create

So create remains idempotent without pretending reruns are brand-new inserts.

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   └── rounds.ts
├── persistence/
│   └── tournament-round/
│       ├── list-tournament-rounds.ts
│       └── upsert-tournament-rounds.ts
├── operations/
│   └── rounds-create/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── rounds/
        ├── map-provider-rounds.ts
        ├── prepare-tournament-rounds.ts
        └── run-tournament-rounds-create.ts
```

This slice may also edit:

```text
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
src/domains/data-provider-v2/providers/sofascore/endpoints.ts
src/domains/data-provider-v2/contracts/errors.ts
src/domains/admin/services/rounds.ts
```

# Phase 1

## Goal

Freeze the shared rounds contract and provider surface.

## Tasks

### Task 1.1 - Add `contracts/rounds.ts` [x]

Create:

```text
src/domains/data-provider-v2/contracts/rounds.ts
```

Define:

1. tournament context for rounds workflows
2. SofaScore tournament-rounds payload types
3. normalized provider round shape
4. create summary/details/report/result types

### Task 1.2 - Extend the SofaScore round provider for `/rounds` [x]

Edit:

```text
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
src/domains/data-provider-v2/providers/sofascore/endpoints.ts
src/domains/data-provider-v2/contracts/errors.ts
```

Add:

1. `buildSofaScoreTournamentRoundsUrl(baseUrl)`
2. provider support for tournament `/rounds`
3. distinct provider error resource for the rounds list request

# Phase 2

## Goal

Add the lower layer and the raw create use-case.

## Tasks

### Task 2.1 - Add rounds persistence helpers [x]

Create:

```text
src/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds.ts
src/domains/data-provider-v2/persistence/tournament-round/upsert-tournament-rounds.ts
```

### Task 2.2 - Add rounds preparation and create use-case [x]

Create:

```text
src/domains/data-provider-v2/use-cases/rounds/map-provider-rounds.ts
src/domains/data-provider-v2/use-cases/rounds/prepare-tournament-rounds.ts
src/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-create.ts
```

Rules:

1. use-case returns raw workflow facts only
2. no execution/report/Slack in the use-case

# Phase 3

## Goal

Wrap rounds create in the standard V2 operation envelope.

## Tasks

### Task 3.1 - Add rounds-create operation files [x]

Create:

```text
src/domains/data-provider-v2/operations/rounds-create/
├── execution-job-store.ts
├── report-builder.ts
├── report-uploader.ts
├── slack-notifier.ts
└── tournament-operation-runner.ts
```

### Task 3.2 - Cut over admin create rounds [x]

Edit:

```text
src/domains/admin/services/rounds.ts
```

Target behavior:

1. `POST /api/v2/admin/tournaments/:tournamentId/rounds`
   - uses the V2 runner
2. keep the top-level HTTP shape:
   - `success`
   - `data: { rounds: ... }`
   - success message
3. if the V2 operation status is not `completed`
   - return `422`

# Phase 4

## Goal

Verify the create workflow after cutover.

## Tasks

### Task 4.1 - Static verification [x]

Run:

1. targeted `yarn eslint`
2. `yarn compile`

### Task 4.2 - Functional verification [ ]

Manually verify:

1. `POST /api/v2/admin/tournaments/:tournamentId/rounds`
2. regular-season-only tournament
3. hybrid tournament
4. knockout-only tournament
5. execution job row
6. uploaded report
7. Slack notification
