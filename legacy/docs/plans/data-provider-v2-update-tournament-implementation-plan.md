# Phase 0

## Goal

Lock the V2 implementation boundary for `Update tournament` before writing runtime code.

This slice is intentionally narrower than a full tournament-maintenance workflow.

It covers only:

1. the admin-triggered update of one existing tournament row
2. `PATCH /api/v2/admin/tournaments/:tournamentId`
3. optional SofaScore-backed logo refresh through the existing shared V2 Playwright asset-upload primitive
4. update of the `tournament` row fields managed by the create flow

It explicitly does **not** include current-round sync, standings, rounds, teams, matches, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [ ]

Rules:

1. this slice is a new V2 workflow; there is no complete admin-level V1 tournament-update flow to port directly
2. the active cutover target is:
   - `PATCH /api/v2/admin/tournaments/:tournamentId`
3. the route `tournamentId` identifies the local row to update
4. this slice is manual/admin-triggered, not batch/scheduler-triggered
5. this slice updates only the create-managed tournament fields:
   - `externalId`
   - `baseUrl`
   - `publicUrl`
   - `slug`
   - `provider`
   - `season`
   - `mode`
   - `label`
   - `standingsMode`
   - `logo`
6. this slice does **not** update:
   - `currentRound`
   - `status`
   - `deletedAt`

### Task 0.2 - Lock the ownership boundaries [ ]

Stable ownership for this slice:

1. `transport/`
   - reuse the existing shared V2 Playwright transport path
   - reuse the shared browser-backed asset upload primitive already created for tournament create
2. `use-cases/tournament/`
   - payload validation
   - compare the submitted payload with the current tournament row
   - decide whether logo refresh is needed
   - shape the DB update payload
   - return raw workflow facts
3. `persistence/tournament/`
   - update one tournament row by local `tournamentId`
4. `operations/tournament-update/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping
5. `admin/`
   - expose the `PATCH` route
   - load the current tournament by `tournamentId`
   - keep HTTP semantics resource-scoped and explicit

### Task 0.3 - Lock the explicit non-goals [ ]

Non-goals for this slice:

1. changing the tournament create workflow
2. tournament current-round sync
3. rounds create/update
4. teams create/update
5. matches create/update
6. standings create/update
7. provider-derived tournament metadata fetch
8. any new scheduler target
9. changing the `tournament` DB schema
10. creating a generic "tournament maintenance engine"

## Decision Notes

### Reference workflow

The primary V2 references for this slice are:

1. [create tournament implementation plan](/Users/mariobrusarosco/coding/api-best-shot/docs/plans/data-provider-v2-create-tournament-implementation-plan.md)
2. [tournament-create operation runner](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/tournament-create/tournament-operation-runner.ts)
3. [standings-create operation runner](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-create/tournament-operation-runner.ts)

Why:

1. all are single admin-triggered operations
2. all need execution/report/Slack
3. tournament update should keep the same use-case -> report-builder -> runner split we just proved in tournament create

### Scope choice

Three viable implementation directions were considered:

1. exact admin row update with optional logo refresh
   - admin sends the desired row state
   - V2 validates, optionally refreshes logo, updates the row, reports result
2. provider-enriched update
   - V2 fetches fresh tournament metadata from SofaScore before update
3. tournament maintenance workflow
   - update tournament plus current-round or dependent data in one action

This plan explicitly chooses **Option 1**.

Why:

1. smallest safe slice
2. easiest admin cutover
3. lowest architectural risk

### Tournament identity rule

This slice should update by **local** tournament identity.

That means:

1. the route `tournamentId` selects the row
2. `externalId + provider` are treated as row data, not as the primary lookup identity

Why:

1. admin is already operating on a concrete local resource
2. it avoids ambiguous targeting if provider data changes
3. it keeps update aligned with the resource-shaped admin API

### Logo refresh rule

Three logo behaviors were considered:

1. always refresh the logo on every update
2. refresh the logo only when `tournamentPublicId` changed or the stored logo is empty
3. never refresh the logo during update

This plan explicitly chooses **Option 2**.

Why:

1. metadata-only updates should not pay the Playwright cost unnecessarily
2. changing the provider public ID should still refresh the logo correctly
3. an empty stored logo should be repaired naturally by the update flow

### Browser-lifetime rule

This workflow should create Playwright resources only when a logo refresh is actually required.

Target behavior:

```text
one tournament-update operation
-> if logo refresh is needed
   -> create one runtime/browser
   -> create one session/context/page
   -> upload logo
   -> close once at the end
-> if logo refresh is not needed
   -> do not start Playwright
```

This is the preferred shape because tournament update may often be metadata-only.

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   └── tournament-update.ts
├── persistence/
│   └── tournament/
│       └── update-tournament.ts
├── operations/
│   └── tournament-update/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── tournament/
        └── run-tournament-update.ts
```

This slice may also edit the following integration files:

```text
src/domains/admin/api/tournaments.ts
src/domains/admin/routes/v2.ts
src/domains/admin/services/tournament.ts
```

This slice explicitly does **not** create:

1. a new transport file
2. a new provider metadata fetcher
3. a scheduler target
4. a public batch update endpoint
5. a generic shared `tournament-operation-runner.ts` across create and update

# Phase 1

## Goal

Freeze the V2 contract surface for tournament update before runtime code exists.

## Tasks

### Task 1.1 - Define the tournament-update workflow contract [x]

Create:

```text
src/domains/data-provider-v2/contracts/tournament-update.ts
```

This contract should define:

1. `TournamentUpdateInput`
2. `TournamentUpdateOutcome`
3. `TournamentUpdateSummary`
4. `TournamentUpdateDetail`
5. `TournamentUpdateDetails`
6. `TournamentUpdateReportData`
7. `TournamentUpdateWorkflowStatus`
8. `TournamentUpdateWorkflowResult`
9. `TournamentUpdateResult`
10. `TournamentUpdateReport`
11. `TournamentUpdateReportUploadResult`

### Task 1.2 - Lock the update outcome vocabulary [x]

Recommended outcome vocabulary:

```ts
type TournamentUpdateOutcome =
  | 'updated'
  | 'invalid_input'
  | 'logo_upload_failed'
  | 'database_update_failed'
  | 'unexpected_failure';
```

Rules:

1. `updated` means the tournament row was updated successfully
2. `invalid_input` means the submitted admin payload was missing or invalid
3. `logo_upload_failed` means the optional logo refresh step failed before DB update completed
4. `database_update_failed` means the row update could not be persisted
5. `unexpected_failure` is reserved for true runtime failures not better classified

### Task 1.3 - Lock the summary contract [x]

Recommended tournament-update summary shape:

```ts
type TournamentUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  updatedTournaments: number;
  uploadedAssets: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

Interpretation rules:

1. `totalOperations` = number of major update steps attempted
2. `successfulOperations` = number of major steps completed successfully
3. `failedOperations` = number of major steps that failed
4. `updatedTournaments` = `1` when the row update succeeds, otherwise `0`
5. `uploadedAssets` = `1` only when a logo refresh was actually performed and succeeded

### Task 1.4 - Lock the report detail contract [x]

Recommended detail buckets:

1. `updated`
2. `invalidInput`
3. `assetUploadFailures`
4. `databaseFailures`
5. `unexpectedFailures`

This report should explain:

1. what input was submitted
2. whether logo refresh was skipped or performed
3. whether the row was updated
4. what failed when the workflow did not complete

# Phase 2

## Goal

Implement the tournament-update domain workflow and persistence path.

## Tasks

### Task 2.1 - Add tournament persistence helper [x]

Create:

```text
src/domains/data-provider-v2/persistence/tournament/update-tournament.ts
```

Responsibilities:

1. update one tournament row by local `tournamentId`
2. return the updated row

Rules:

1. persistence should not validate admin payload semantics
2. persistence should not know execution/report/Slack semantics

### Task 2.2 - Add the tournament-update use-case [x]

Create:

```text
src/domains/data-provider-v2/use-cases/tournament/run-tournament-update.ts
```

Responsibilities:

1. normalize and validate the admin payload
2. compare the submitted payload against the current tournament row
3. decide whether logo refresh is required
4. upload a fresh logo only when required
5. shape the DB update payload
6. update the tournament row
7. return raw workflow facts only

Rules:

1. this slice must not fetch extra tournament metadata from the provider
2. this slice must not update dependent rows outside `tournament`
3. this slice must preserve the current tournament logo when refresh is skipped
4. this slice must not build `summary/details/data/status` inside the use-case

# Phase 3

## Goal

Add the operational envelope for tournament update.

## Tasks

### Task 3.1 - Add execution-job store [x]

Create:

```text
src/domains/data-provider-v2/operations/tournament-update/execution-job-store.ts
```

Rules:

1. create the `in_progress` execution row with the real `tournamentId` from the start
2. finalize as `completed` or `failed`
3. do not use the create-flow `null` tournament-id pattern here

### Task 3.2 - Add report upload and Slack notification [x]

Create:

```text
src/domains/data-provider-v2/operations/tournament-update/report-uploader.ts
src/domains/data-provider-v2/operations/tournament-update/slack-notifier.ts
```

Rules:

1. report upload is always attempted
2. upload failure is observable but not automatically a domain failure
3. Slack should include:
   - tournament label
   - operation
   - status
   - environment
   - compact summary
   - report link when available

### Task 3.3 - Add report-builder and operation runner [x]

Create:

```text
src/domains/data-provider-v2/operations/tournament-update/report-builder.ts
src/domains/data-provider-v2/operations/tournament-update/tournament-operation-runner.ts
```

Responsibilities:

1. create execution job
2. create runtime/session only when logo refresh is required
3. run the tournament-update use-case
4. build the report/result shape from raw workflow facts
5. upload report
6. finalize execution job
7. send Slack
8. close session/runtime when they were created

This runner should stay workflow-specific and should not try to become a generic tournament maintenance framework.

# Phase 4

## Goal

Wire the admin tournament update endpoint to the new V2 workflow.

## Tasks

### Task 4.1 - Add the admin PATCH route [x]

Edit:

```text
src/domains/admin/api/tournaments.ts
src/domains/admin/routes/v2.ts
```

Target behavior:

1. expose:
   - `PATCH /api/v2/admin/tournaments/:tournamentId`
2. keep the endpoint resource-scoped
3. do not add a public batch update endpoint

### Task 4.2 - Switch admin tournament update to V2 [x]

Edit:

```text
src/domains/admin/services/tournament.ts
```

Target behavior:

1. load the current tournament by `tournamentId`
2. return `404` if the local tournament does not exist
3. keep the provider guard explicit for the first slice
4. call the V2 tournament-update operation runner
5. return `200` with `data: { tournament }` on success
6. return `422` with the raw workflow result on non-completed update outcomes

### Task 4.3 - Keep the cutover explicit [x]

Rules:

1. do not silently route tournament create into this workflow
2. do not silently route current-round sync into this workflow
3. this cutover is manual/admin-update only

# Phase 5

## Goal

Verify V2 tournament-update behavior against current product expectations.

## Tasks

### Task 5.1 - Compile verification [x]

Run:

```text
yarn compile
```

### Task 5.2 - Functional verification [ ]

Verify:

1. one metadata-only update where logo refresh is skipped
2. one update where `tournamentPublicId` changes and logo refresh is performed
3. one invalid-input failure path
4. one DB failure path if practical in local testing

Expected:

1. the tournament row is updated exactly once on success
2. the stored logo remains unchanged when refresh is skipped
3. the stored logo changes when refresh is required and succeeds
4. execution summary remains compatible with the admin execution-jobs UI
5. report is uploaded when possible
6. Slack wording matches the final workflow status

## Final Notes

This plan intentionally keeps tournament update V2 smaller than it may eventually become.

That is deliberate.

If we first prove:

1. resource-scoped admin update
2. conditional logo refresh
3. tournament row update
4. execution/report/Slack

then later expansion into broader tournament-maintenance flows will be easier and safer.
