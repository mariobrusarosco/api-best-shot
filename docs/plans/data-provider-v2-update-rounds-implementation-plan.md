# Phase 0

## Goal

Lock the V2 implementation boundary for `Update rounds for a tournament` before writing runtime code.

This slice is intentionally narrow.

It covers only:

1. the admin-triggered **update rounds** workflow
2. one tournament at a time
3. SofaScore-backed full rounds refresh through the shared V2 Playwright transport
4. upsert of the full `/rounds` payload for one tournament

It explicitly does **not** include knockout-round discovery orchestration, matches sync, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [x]

Rules:

1. This slice implements only the V2 equivalent of V1 `RoundsDataProviderService.update(...)`.
2. The active cutover target is:
   - `PATCH /api/v2/admin/tournaments/:tournamentId/rounds`
3. Update rounds fetches and upserts all tournament rounds, regardless of tournament mode.
4. This slice is manual/admin-triggered, not batch/scheduler-triggered.

### Task 0.2 - Lock the ownership boundaries [x]

Stable ownership for this slice:

1. `transport/`
   - reuse the shared V2 Playwright runtime/session path
2. `providers/sofascore/`
   - reuse the shared round provider and the tournament `/rounds` request
3. `use-cases/rounds/`
   - reuse the shared rounds preparation path
   - upsert tournament round rows
   - return raw workflow facts
4. `persistence/tournament-round/`
   - reuse the shared round read and upsert helpers
5. `operations/rounds-update/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [x]

Non-goals for this slice:

1. rounds create changes
2. knockout-round discovery orchestration
3. matches create/update
4. tournament current-round sync
5. scheduler or cron integration
6. changing the `tournament_round` schema

## Decision Notes

### Generic update rule

Update uses the same generic rule as create:

```text
fetch /rounds
-> normalize every provider round
-> upsert the normalized round rows
```

There is no special update branch for knockout-only or hybrid tournaments.

### Why knockout-round discovery stays separate

The specialized V1 knockout sync is not the main rounds-maintenance workflow.

It is a different orchestration concern:

1. detect newly available knockout rounds
2. optionally validate them against round events
3. sometimes trigger downstream match work

That should remain a later dedicated V2 slice.

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── operations/
│   └── rounds-update/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── rounds/
        └── run-tournament-rounds-update.ts
```

This slice may also edit the shared rounds files introduced by create:

```text
src/domains/data-provider-v2/contracts/rounds.ts
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
src/domains/data-provider-v2/use-cases/rounds/map-provider-rounds.ts
src/domains/data-provider-v2/use-cases/rounds/prepare-tournament-rounds.ts
src/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds.ts
src/domains/data-provider-v2/persistence/tournament-round/upsert-tournament-rounds.ts
src/domains/admin/services/rounds.ts
```

# Phase 1

## Goal

Extend the shared rounds contract for update semantics.

## Tasks

### Task 1.1 - Extend `contracts/rounds.ts` for update [x]

Add:

1. update summary/details/report/result types
2. update outcome vocabulary
3. update workflow status rule

# Phase 2

## Goal

Add the raw update use-case.

## Tasks

### Task 2.1 - Add `run-tournament-rounds-update.ts` [x]

Create:

```text
src/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-update.ts
```

Responsibilities:

1. reuse the shared rounds preparation path
2. upsert normalized rounds
3. classify created-during-update vs updated rounds
4. return raw workflow facts only

# Phase 3

## Goal

Wrap rounds update in the standard V2 operation envelope and cut over the admin route.

## Tasks

### Task 3.1 - Add rounds-update operation files [x]

Create:

```text
src/domains/data-provider-v2/operations/rounds-update/
├── execution-job-store.ts
├── report-builder.ts
├── report-uploader.ts
├── slack-notifier.ts
└── tournament-operation-runner.ts
```

### Task 3.2 - Cut over admin update rounds [x]

Edit:

```text
src/domains/admin/services/rounds.ts
```

Target behavior:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/rounds`
   - uses the V2 runner
2. keep the top-level HTTP shape:
   - `success`
   - `data: { rounds: ... }`
   - success message
3. if the V2 operation status is not `completed`
   - return `422`

# Phase 4

## Goal

Verify the update workflow after cutover.

## Tasks

### Task 4.1 - Static verification [x]

Run:

1. targeted `yarn eslint`
2. `yarn compile`

### Task 4.2 - Functional verification [ ]

Manually verify:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/rounds`
2. update against existing season rounds
3. update discovering knockout rounds naturally through `/rounds`
4. execution job row
5. uploaded report
6. Slack notification
