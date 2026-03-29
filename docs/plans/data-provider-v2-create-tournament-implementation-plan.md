# Phase 0

## Goal

Lock the V2 implementation boundary for `Create tournament` before writing runtime code.

This slice is intentionally narrower than a full tournament bootstrap workflow.

It covers only:

1. the admin-triggered **create tournament** workflow
2. one tournament at a time
3. SofaScore-backed logo upload through the existing Playwright transport path
4. creation of the `tournament` row only

It explicitly does **not** include rounds, teams, matches, standings, or current-round sync.

## Tasks

### Task 0.1 - Lock the workflow boundary [ ]

Rules:

1. This slice implements only the V2 equivalent of V1 `TournamentDataProvider.init(...)`.
2. The active cutover target is the admin create action:
   - `POST /api/v2/admin/tournaments`
3. Tournament update remains on V1 for now.
4. Tournament current-round sync remains on V1 for now.
5. This slice is manual/admin-triggered, not batch/scheduler-triggered.

### Task 0.2 - Lock the ownership boundaries [ ]

Stable ownership for this slice:

1. `transport/`
   - reuse the existing Playwright transport path already implemented for V2
   - browser/runtime/session mechanics
   - generic navigation primitives already part of the shared transport
   - add one shared browser-backed asset upload primitive if needed for tournament logo handling
2. `providers/sofascore/`
   - provider-specific asset access only if needed for tournament logo handling
   - no tournament metadata scraping in this first slice
3. `use-cases/tournament/`
   - payload validation
   - tournament logo upload orchestration
   - DB insert payload shaping
   - workflow result shaping
4. `persistence/tournament/`
   - insert tournament row only
5. `operations/tournament-create/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [ ]

Non-goals for this slice:

1. tournament update
2. tournament current-round sync
3. rounds create/update
4. teams create/update
5. matches create/update
6. standings create/update
7. any new scheduler target
8. provider-derived tournament metadata fetch
9. changing the `tournament` DB schema
10. changing admin request or response shape beyond the internal V2 cutover

## Decision Notes

### Reference workflow

The primary V2 reference for this slice is:

1. [standings-create implementation plan](/Users/mariobrusarosco/coding/api-best-shot/docs/plans/data-provider-v2-create-standings-implementation-plan.md)
2. [standings-create operation runner](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/operations/standings-create/tournament-operation-runner.ts)

Why:

1. both workflows are single admin-triggered operations
2. both need execution/report/Slack
3. both fit the conservative single-operation browser lifetime

### Scope choice

There are three viable implementation directions:

1. exact V1-equivalent create
   - admin provides the full payload
   - V2 validates, uploads logo, inserts tournament, reports result
2. provider-enriched create
   - admin provides a smaller payload
   - V2 fetches extra tournament metadata from provider before insert
3. tournament bootstrap
   - create tournament plus rounds/current-round/other dependent data

This plan explicitly chooses **Option 1**.

Why:

1. smallest parity slice
2. easiest cutover
3. lowest architectural risk

### Temporary execution tournament id

V1 tournament create starts execution before the real tournament row exists.
It therefore uses a temporary tournament id and later updates the execution record with the real tournament id.

V2 should preserve that behavior in the first slice instead of redesigning execution semantics immediately.

This keeps the cutover low-risk and behaviorally familiar.

### Transport split rule

V2 transports must still be split by **technical access mechanism**, not by workflow.

That means:

1. tournament create must reuse the existing V2 Playwright transport/runtime approach
2. this slice must not create a tournament-create-only transport helper just because the workflow is new

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── transport/
│   └── playwright/
│       └── browser-asset-uploader.ts
├── contracts/
│   └── tournament-create.ts
├── persistence/
│   └── tournament/
│       └── insert-tournament.ts
├── operations/
│   └── tournament-create/
│       ├── execution-job-store.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── tournament/
        └── run-tournament-create.ts
```

This slice may also edit the following integration file:

```text
src/domains/admin/services/tournament.ts
```

This slice explicitly does **not** create:

1. a new scheduler target
2. a V2 tournament update runner
3. a V2 current-round runner
4. a generic top-level `notifications/` layer
5. a generic top-level `reporting/` layer
6. a top-level `assets/` layer

## Locked Browser-Lifetime Rule

This workflow is single-operation, not batch-driven.

So the browser lifetime rule for this slice is:

```text
one tournament-create operation
-> one runtime/browser
-> one session/context/page
-> one provider-backed asset upload workflow
-> close once at the end
```

This matches the proven `standings-create` pattern.

# Phase 1

## Goal

Freeze the V2 contract surface for tournament create before runtime code exists.

## Tasks

### Task 1.1 - Define the tournament-create workflow contract [ ]

Create:

```text
src/domains/data-provider-v2/contracts/tournament-create.ts
```

This contract should define:

1. tournament-create summary contract
2. tournament-create detail contract
3. tournament-create report data contract
4. tournament-create workflow status
5. tournament-create report upload result contract
6. tournament-create result contract

### Task 1.2 - Define the tournament-create outcome vocabulary [ ]

The tournament create workflow should use explicit local outcomes rather than loose messages.

Recommended outcome vocabulary:

```ts
type TournamentCreateOutcome =
  | 'created'
  | 'invalid_input'
  | 'logo_upload_failed'
  | 'database_insert_failed'
  | 'unexpected_failure';
```

Rules:

1. `invalid_input` means required admin payload fields were missing or empty
2. `logo_upload_failed` means the provider-backed logo step failed before DB insert completed
3. `database_insert_failed` means the tournament row could not be created
4. `unexpected_failure` is reserved for true runtime or transport failures that are not better classified

### Task 1.3 - Lock the summary contract [ ]

The tournament-scoped summary should remain compatible with the current admin execution-jobs read path by keeping:

1. `totalOperations`
2. `successfulOperations`
3. `failedOperations`

Recommended tournament-create summary shape:

```ts
type TournamentCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  createdTournaments: number;
  uploadedAssets: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

Interpretation rules:

1. `totalOperations` = number of major create steps attempted
2. `successfulOperations` = number of major steps completed successfully
3. `failedOperations` = number of major steps that failed
4. `createdTournaments` = `1` when the tournament row is inserted, otherwise `0`
5. `uploadedAssets` = `1` when the logo upload completes, otherwise `0`

### Task 1.4 - Lock the report detail contract [ ]

Recommended detail buckets:

1. `created`
2. `invalidInput`
3. `assetUploadFailures`
4. `databaseFailures`
5. `unexpectedFailures`

This report should be the forensic artifact for:

1. what input was accepted
2. whether the logo upload succeeded
3. whether the tournament row was created
4. what failed when the workflow did not complete

# Phase 2

## Goal

Implement the tournament-create domain workflow and persistence path.

## Tasks

### Task 2.1 - Add tournament persistence helper [ ]

Create:

```text
src/domains/data-provider-v2/persistence/tournament/insert-tournament.ts
```

Responsibilities:

1. insert one tournament row

Rules:

1. persistence should not validate admin payload semantics
2. persistence should not know execution/report/Slack semantics

### Task 2.2 - Add the tournament-create use-case [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/tournament/run-tournament-create.ts
```

Responsibilities:

1. validate the incoming admin payload
2. upload the tournament logo
3. shape the DB insert payload
4. insert the tournament row
5. return explicit summary, details, and workflow status

Rules:

1. this slice must not fetch extra tournament metadata from the provider
2. this slice must not create dependent rows outside `tournament`
3. this slice must preserve the existing admin payload semantics in the first cut

# Phase 3

## Goal

Add the operational envelope for tournament create.

## Tasks

### Task 3.1 - Add execution-job store [ ]

Create:

```text
src/domains/data-provider-v2/operations/tournament-create/execution-job-store.ts
```

Rules:

1. create the `in_progress` row before the tournament exists, using the temporary-id approach from V1
2. update the execution record with the real tournament id after create succeeds
3. finalize as `completed` or `failed`

### Task 3.2 - Add report upload and Slack notification [ ]

Create:

```text
src/domains/data-provider-v2/operations/tournament-create/report-uploader.ts
src/domains/data-provider-v2/operations/tournament-create/slack-notifier.ts
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

### Task 3.3 - Add the tournament operation runner [ ]

Create:

```text
src/domains/data-provider-v2/operations/tournament-create/tournament-operation-runner.ts
```

Responsibilities:

1. create execution job
2. create runtime/session
3. run the tournament-create use-case
4. update execution job with the real tournament id after successful insert
5. build/upload report
6. finalize execution job
7. send Slack
8. close session/runtime

This runner should stay workflow-specific and should not try to become a generic tournament bootstrap framework.

# Phase 4

## Goal

Wire the admin create tournament endpoint to the new V2 workflow.

## Tasks

### Task 4.1 - Switch admin create tournament to V2 [ ]

Edit:

```text
src/domains/admin/services/tournament.ts
```

Target behavior:

1. `createTournament` calls the V2 operation runner
2. response shape remains stable for admin callers
3. V1 tournament update and current-round sync remain untouched

### Task 4.2 - Keep the cutover explicit [ ]

Rules:

1. do not silently route tournament update into V2
2. do not silently route current-round sync into V2
3. this cutover is manual/admin-create only

# Phase 5

## Goal

Verify V2 tournament-create behavior against the current product expectations.

## Tasks

### Task 5.1 - Compile verification [ ]

Run:

```text
yarn compile
```

### Task 5.2 - Functional verification [ ]

Verify:

1. one successful tournament create using the current admin payload
2. one invalid-input failure path
3. one asset-upload or DB failure path if practical in local testing

Expected:

1. tournament row is created exactly once on success
2. execution summary is compatible with admin execution-jobs UI
3. report is uploaded when possible
4. Slack wording matches the final workflow status

## Final Notes

This plan intentionally keeps tournament create V2 smaller than it may eventually become.

That is deliberate.

If we first prove:

1. admin payload validation
2. logo upload
3. tournament insert
4. execution/report/Slack

then later slices for:

1. tournament update
2. current-round sync
3. rounds bootstrap
4. teams bootstrap

can be designed from a stable base instead of being bundled into one hard-to-review migration.
