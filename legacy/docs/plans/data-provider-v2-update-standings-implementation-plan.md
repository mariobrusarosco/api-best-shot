# Phase 0

## Goal

Lock the V2 implementation boundary for `Update standings` before writing runtime code.

This slice is intentionally narrower than a full standings-orchestration migration.

It covers only:

1. the V2 equivalent of V1 standings update
2. an internal batch entrypoint that accepts `tournamentIds: string[]`
3. single-tournament admin update by delegating with `[tournamentId]`
4. SofaScore-backed standings fetched through the existing shared V2 Playwright transport

It explicitly does **not** include standings create changes, cron integration, or a new public batch endpoint.

## Tasks

### Task 0.1 - Lock the workflow boundary [ ]

Rules:

1. This slice implements only the V2 equivalent of V1 `StandingsDataProviderService.update(...)`.
2. The active cutover target is:
   - `PATCH /api/v2/admin/tournaments/:tournamentId/standings`
3. The core internal orchestration entrypoint accepts:
   - `tournamentIds: string[]`
4. The admin `PATCH` route remains single-resource shaped and delegates with:
   - `[tournamentId]`
5. Future internal callers may pass many tournament IDs to the same batch entrypoint.
6. This slice does **not** add a new public admin endpoint that accepts an array payload.
7. This slice does **not** add cron/scheduler integration yet.

### Task 0.2 - Lock the ownership boundaries [ ]

Stable ownership for this slice:

1. `transport/`
   - reuse the existing shared V2 Playwright transport path
   - browser/runtime/session mechanics
   - generic browser navigation / JSON extraction primitives already used by V2
2. `providers/sofascore/`
   - reuse the existing standings endpoint construction and provider access
   - do not create a second standings provider for update
3. `persistence/standings/`
   - reuse team lookup by `provider + externalId`
   - add only the update-specific DB write strategy:
     - upsert standings rows
4. `use-cases/standings/`
   - `run-tournament-standings-update.ts`
     - tournament-scoped update flow
     - same provider fetch / mapping path as create
     - update-specific summary and detail shaping
   - `run-standings-update-batch.ts`
     - dedupe/normalize input IDs
     - resolve tournaments
     - own the shared runtime/session lifecycle for the batch
     - call one tournament update operation per valid tournament
5. `operations/standings-update/`
   - tournament-scoped execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping
6. `admin/services/standings.ts`
   - keep HTTP semantics for a single tournament update
   - delegate to the batch use case with `[tournamentId]`

### Task 0.3 - Lock the explicit non-goals [ ]

Non-goals for this slice:

1. changing the V2 standings create workflow
2. creating a new transport path for standings update
3. creating a second standings provider just for update
4. coupling match sync directly to standings update in the same workflow
5. adding cron/scheduler targets for standings update
6. creating a new public admin endpoint that accepts many tournament IDs
7. refactoring create and update into a generic "standings engine"
8. adding a new bulk tournament query unless profiling proves it is needed
9. changing `standingsMode` read/render behavior
10. changing the `tournament_standings` schema

## Decision Notes

### Chosen orchestration shape

Three shapes were considered:

1. Single-tournament update only
   - simplest public API shape
   - rejected because it would force a second orchestration layer later when we want one browser for many tournaments
2. Public batch HTTP endpoint that accepts many IDs
   - flexible
   - rejected because the current admin interaction is tournament-resource scoped and does not need a batch route yet
3. Internal batch orchestration with `tournamentIds: string[]`
   - chosen
   - keeps one reusable orchestration core
   - allows single update with `[tournamentId]`
   - supports future multi-tournament reuse without changing transport architecture

### Tournament lookup rule

This slice should stay conservative about cross-domain expansion.

So the batch use case will:

1. accept `tournamentIds: string[]`
2. dedupe and normalize them
3. resolve tournaments with existing tournament services first
4. avoid adding a new bulk tournament query in this slice

If later evidence shows tournament lookup volume is a real bottleneck, we can add a dedicated bulk query as a targeted follow-up.

### Transport rule

This slice must reuse the existing shared V2 Playwright transport.

That means:

1. no new `browser-page-json.ts`
2. no update-specific Playwright helper
3. no separate standings transport path

The mechanism is still:

```text
shared Playwright runtime/session
-> browser navigation to provider URL
-> JSON extraction through the existing shared transport
```

### Browser-lifetime rule

The internal batch use case owns the browser lifetime:

```text
runStandingsUpdateBatch(tournamentIds)
-> create runtime/browser once
-> create session/context/page once
-> for each valid tournament
   -> run tournament standings update operation using the shared session
-> close session once
-> close runtime once
```

That same batch entrypoint is used for:

1. single admin update via `[tournamentId]`
2. future multi-tournament callers

## Locked File Map

This slice is allowed to create only the following update-specific V2 files:

```text
src/domains/data-provider-v2/
├── persistence/
│   └── standings/
│       └── upsert-tournament-standings.ts
├── operations/
│   └── standings-update/
│       ├── execution-job-store.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── standings/
        ├── run-tournament-standings-update.ts
        └── run-standings-update-batch.ts
```

This slice may also edit the following existing files:

```text
src/domains/data-provider-v2/contracts/standings.ts
src/domains/data-provider-v2/providers/sofascore/standings-provider.ts
src/domains/admin/services/standings.ts
```

This slice explicitly does **not** create:

1. a new transport file
2. a new standings provider file for update
3. a new scheduler target
4. a new public batch API route
5. a generic `standings-operation-runner.ts` shared by create and update

# Phase 1

## Goal

Freeze the V2 contract surface for standings update before runtime code exists.

## Tasks

### Task 1.1 - Extend the standings contract for update [ ]

Edit:

```text
src/domains/data-provider-v2/contracts/standings.ts
```

Add update-specific contract shapes while keeping shared provider payload and mapping types in the same file.

This contract should define:

1. `StandingsUpdateOutcome`
2. `TournamentStandingsUpdateSummary`
3. `StandingsUpdateDetail`
4. `TournamentStandingsUpdateDetails`
5. `StandingsUpdateReportData`
6. `StandingsUpdateWorkflowStatus`
7. `TournamentStandingsUpdateResult`
8. `StandingsUpdateReport`
9. `StandingsUpdateBatchSummary`

### Task 1.2 - Lock the update outcome vocabulary [ ]

Recommended outcome vocabulary:

```ts
type StandingsUpdateOutcome =
  | 'updated'
  | 'tournament_mode_not_supported'
  | 'provider_response_missing_standings'
  | 'provider_team_not_found_in_db'
  | 'unexpected_failure';
```

Rules:

1. `updated` means the row was successfully upserted into `tournament_standings`
2. `tournament_mode_not_supported` is the explicit rule for `knockout-only`
3. `provider_response_missing_standings` means the provider payload did not contain usable standings rows
4. `provider_team_not_found_in_db` means a provider standings row referenced a team we do not have locally
5. `unexpected_failure` is reserved for true provider, persistence, or runtime failures that are not downgraded

### Task 1.3 - Lock the tournament summary contract [ ]

Recommended tournament summary shape:

```ts
type TournamentStandingsUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedGroups: number;
  fetchedRows: number;
  updatedRows: number;
  missingTeamsCount: number;
  providerMissingStandingsCount: number;
  updatedTeamIdsPreview?: string[];
  missingTeamExternalIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

Interpretation rules:

1. `totalOperations` = number of provider standings rows considered by the update use case
2. `successfulOperations` = standings rows successfully upserted
3. `failedOperations` = standings rows that could not be completed
4. `updatedRows` = number of rows passed through the upsert path
5. `missingTeamsCount` = number of provider rows blocked by unresolved team references
6. `providerMissingStandingsCount` = `1` when the provider returned no usable standings payload for the tournament update, otherwise `0`

### Task 1.4 - Lock the batch summary contract [ ]

Recommended batch summary shape:

```ts
type StandingsUpdateBatchSummary = {
  totalRequestedTournaments: number;
  queuedTournaments: number;
  completedTournaments: number;
  failedTournaments: number;
  skippedInvalidTournaments: number;
  skippedTournamentIdsPreview?: string[];
};
```

Interpretation rules:

1. `totalRequestedTournaments` = number of unique normalized input tournament IDs
2. `queuedTournaments` = valid tournaments that entered the tournament update operation
3. `completedTournaments` = tournament operations that ended as `completed`
4. `failedTournaments` = tournament operations that ended as `failed` or `partial_failure`
5. `skippedInvalidTournaments` = input IDs skipped before queueing because the tournament could not be resolved or is not eligible for this slice
6. preview arrays remain bounded and are for quick admin/debug visibility only

# Phase 2

## Goal

Reuse the current standings lower layers and add only the update-specific persistence seam.

## Tasks

### Task 2.1 - Reuse the existing standings provider path [ ]

Rules:

1. `SofaScoreStandingsProvider` remains the provider entrypoint for both create and update
2. standings update must keep using the existing shared Playwright transport
3. no update-specific transport helper is allowed in this phase

### Task 2.2 - Add the update-specific persistence writer [ ]

Create:

```text
src/domains/data-provider-v2/persistence/standings/upsert-tournament-standings.ts
```

Rules:

1. keep the V1 conflict target semantics:
   - `shortName + tournamentId`
2. return update detail records shaped for the V2 update report
3. keep team lookup and standings mapping unchanged

### Task 2.3 - Do not refactor create/update into one generic standings core [ ]

Rules:

1. shared lower layers may be reused
2. update may duplicate a small amount of workflow code if that keeps ownership obvious
3. this slice does not introduce a mode flag that merges create and update into one runner

# Phase 3

## Goal

Add the update use cases on top of the existing provider and mapping path.

## Tasks

### Task 3.1 - Add the tournament-scoped update use case [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/standings/run-tournament-standings-update.ts
```

Rules:

1. keep the same provider fetch path as create
2. keep the same `knockout-only` guard as create
3. keep the same team lookup by `provider + externalId`
4. keep the same provider-missing-standings classification path as create
5. change only the DB write strategy from `insert` to `upsert`
6. return update-specific summary, details, and data

### Task 3.2 - Add the batch orchestration use case [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/standings/run-standings-update-batch.ts
```

Rules:

1. input is:
   - `tournamentIds: string[]`
2. normalize and dedupe IDs before queueing
3. resolve tournaments using existing tournament services in this slice
4. skip invalid/unusable IDs before queueing and track them in the batch summary
5. create one shared runtime/session for the whole batch
6. call one tournament update operation per queued tournament
7. close runtime/session once at the end

### Task 3.3 - Keep match sync decoupled [ ]

Rules:

1. this slice does not make open-match sync call standings update directly
2. future callers may pass tournament IDs into the batch use case, but that wiring is outside this slice

# Phase 4

## Goal

Add the tournament-scoped update operation envelope.

## Tasks

### Task 4.1 - Add standings-update operation files [ ]

Create:

```text
src/domains/data-provider-v2/operations/standings-update/
├── execution-job-store.ts
├── report-uploader.ts
├── slack-notifier.ts
└── tournament-operation-runner.ts
```

Rules:

1. keep the same operational pattern already used by V2 workflows:
   - execution job
   - result/report
   - report upload
   - finalize execution
   - Slack
2. tournament reports remain tournament-scoped even when browser lifetime is batch-scoped
3. the tournament operation runner must accept the shared browser session from the batch use case

### Task 4.2 - Preserve the current observability shape [ ]

Rules:

1. tournament report is the forensic artifact
2. summary stays compact and execution-job friendly
3. no per-row exception fan-out is introduced in this slice

# Phase 5

## Goal

Cut over the admin single-tournament update route to the new V2 batch-backed path.

## Tasks

### Task 5.1 - Update the admin route integration [ ]

Edit:

```text
src/domains/admin/services/standings.ts
```

Rules:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/standings` becomes the V2 entrypoint
2. the route remains single-resource shaped
3. it delegates to the batch use case with `[tournamentId]`
4. keep the response shape compatible with the existing admin expectations

### Task 5.2 - Preserve route semantics [ ]

Rules:

1. the route should keep explicit handling for:
   - missing tournament ID
   - tournament not found
   - unsupported provider
2. the route should not expose a new multi-tournament public contract in this slice

# Verification

Before implementation is considered complete, verify:

1. single-tournament admin update works through the V2 batch entrypoint
2. many-tournament internal batch update reuses one browser runtime/session
3. `knockout-only` tournaments fail clearly
4. provider-missing-standings still produces a clear report
5. missing local teams still block the tournament update clearly
6. `yarn compile` passes
