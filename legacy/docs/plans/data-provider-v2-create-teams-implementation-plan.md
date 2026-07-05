# Phase 0

## Goal

Lock the V2 implementation boundary for `Create teams for a tournament` before writing runtime code.

This slice is intentionally narrower than a full team-sync migration.

It covers only:

1. the admin-triggered **create teams** workflow
2. one tournament at a time
3. SofaScore-backed team discovery through the existing shared V2 Playwright transport
4. creation of global `team` rows discovered from one tournament context

It explicitly does **not** include teams update, rounds update, matches update, or scheduler work.

## Tasks

### Task 0.1 - Lock the workflow boundary [x]

Rules:

1. This slice implements only the V2 equivalent of V1 `TeamsDataProviderService.init(...)`.
2. The active cutover target is:
   - `POST /api/v2/admin/tournaments/:tournamentId/teams`
3. The route `tournamentId` identifies the discovery context, not team ownership.
4. Persisted team rows remain global by:
   - `provider + externalId`
5. This slice is manual/admin-triggered, not batch/scheduler-triggered.

### Task 0.2 - Lock the ownership boundaries [x]

Stable ownership for this slice:

1. `transport/`
   - reuse the shared V2 Playwright runtime/session path
   - reuse the shared browser-backed asset upload primitive
2. `providers/sofascore/`
   - reuse the existing standings provider for standings-backed team discovery
   - add one reusable round provider for fetching a stored round `providerUrl`
3. `use-cases/teams/`
   - choose the eligible provider sources from tournament mode
   - fetch and map provider teams
   - dedupe provider teams across standings and knockout sources
   - classify existing local teams
   - upload badges only for newly creatable teams
   - insert missing global team rows
   - return raw workflow facts
4. `persistence/team/`
   - list existing teams by `provider + externalId`
   - insert missing team rows
5. `operations/teams-create/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [x]

Non-goals for this slice:

1. teams update
2. rounds create/update
3. matches create/update
4. standings create/update changes
5. tournament create/update changes
6. scheduler or cron integration
7. changing the `team` schema
8. creating a tournament-team join table
9. building a generic “team sync engine”

## Decision Notes

### Teams are global rows discovered from a tournament context

This is the most important rule for this workflow.

The admin route is tournament-scoped:

```text
POST /api/v2/admin/tournaments/:tournamentId/teams
```

But persistence is **not** tournament-scoped:

```text
team rows are global by provider + externalId
```

So the create workflow is really:

```text
discover teams from one tournament
-> create missing global team rows
```

### Source-composition choice

Three directions were considered:

1. standings-only team discovery
   - too narrow
   - rejected because V1 supports knockout-sourced teams too
2. exact V1 source composition by tournament mode
   - chosen
3. derive teams from matches instead of standings/rounds
   - rejected because that is a different workflow dependency shape

This plan explicitly chooses **Option 2**.

Meaning:

1. `regular-season-only`
   - standings source only
2. `knockout-only`
   - knockout rounds source only
3. `regular-season-and-knockout`
   - standings source plus knockout rounds source

### Create write-strategy choice

Three directions were considered:

1. exact V1 behavior
   - upload badges for every mapped team
   - then insert with `onConflictDoNothing`
2. classify existing teams first
   - upload badges only for teams that do not already exist locally
   - then insert only missing rows
   - chosen
3. upsert everything in create
   - rejected because it collapses create and update semantics too early

This plan explicitly chooses **Option 2**.

Why:

1. same final DB effect as create
2. avoids unnecessary Playwright/S3 work
3. keeps update available as the explicit refresh/upsert workflow

### Missing-source rule

V1 is permissive and unclear when one source is empty or missing.

V2 will make that behavior explicit:

1. if all eligible sources fail or return no usable teams
   - workflow fails
2. if one eligible source is missing but another source produced usable teams
   - workflow may complete as `partial_failure`
3. already-existing local teams are **not** failures
   - they are skipped-existing outcomes

### Browser-lifetime rule

This workflow is single-operation, not batch-driven.

So the browser lifetime rule is:

```text
one teams-create operation
-> one runtime/browser
-> one session/context/page
-> provider fetches + badge uploads
-> close once at the end
```

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   └── teams.ts
├── providers/
│   └── sofascore/
│       └── round-provider.ts
├── persistence/
│   └── team/
│       ├── insert-teams.ts
│       └── list-teams-by-external-id.ts
├── operations/
│   └── teams-create/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── teams/
        ├── map-provider-teams.ts
        ├── prepare-tournament-teams.ts
        └── run-tournament-teams-create.ts
```

This slice may also edit the following integration file:

```text
src/domains/admin/services/teams.ts
```

This slice explicitly does **not** create:

1. a new transport path
2. a scheduler target
3. a public batch API
4. a shared generic teams runner across create and update

# Phase 1

## Goal

Freeze the shared teams contract surface before runtime code exists.

## Tasks

### Task 1.1 - Define the shared teams contract [x]

Create:

```text
src/domains/data-provider-v2/contracts/teams.ts
```

This contract should define:

1. tournament context used by teams workflows
2. provider team payload types needed by teams workflows
3. mapped team candidate shape
4. create-teams summary contract
5. create-teams detail contract
6. create-teams workflow status
7. create-teams workflow result
8. create-teams report upload result

### Task 1.2 - Lock the create-teams outcome vocabulary [x]

Recommended create outcome vocabulary:

```ts
type TeamsCreateOutcome =
  | 'created'
  | 'provider_source_missing_teams'
  | 'provider_team_payload_invalid'
  | 'existing_team_skipped'
  | 'asset_upload_failed'
  | 'database_insert_failed'
  | 'unexpected_failure';
```

Rules:

1. `created` means a new local team row was inserted
2. `provider_source_missing_teams` means an eligible provider source returned no usable teams
3. `provider_team_payload_invalid` means a provider team row was missing required identifiers or names
4. `existing_team_skipped` means the global team row already existed locally
5. `asset_upload_failed` means badge upload failed for a new team before DB insert
6. `database_insert_failed` means the create write step failed

### Task 1.3 - Lock the create summary contract [x]

Recommended summary shape:

```ts
type TournamentTeamsCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedSources: number;
  fetchedTeams: number;
  createdTeams: number;
  skippedExistingTeams: number;
  uploadedAssets: number;
  providerMissingSourcesCount: number;
  invalidProviderTeamsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

### Task 1.4 - Lock the create detail buckets [x]

Recommended detail buckets:

1. `created`
2. `skippedExisting`
3. `providerMissingSources`
4. `invalidProviderTeams`
5. `assetUploadFailures`
6. `databaseFailures`
7. `unexpectedFailures`

### Task 1.5 - Lock the workflow status rule [x]

Recommended workflow status:

```ts
type TeamsCreateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';
```

Interpretation:

1. `completed`
   - all usable candidates were processed and no source-level or provider-row failures occurred
2. `partial_failure`
   - at least one team was created or skipped-existing, but some eligible source or provider rows failed
3. `failed`
   - no usable create result was produced, or the operation aborted before the write completed

# Phase 2

## Goal

Build the reusable lower layers that Team Create needs and Team Update will reuse later.

## Tasks

### Task 2.1 - Add a reusable SofaScore round provider [x]

Create:

```text
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
```

It should:

1. fetch a stored round `providerUrl`
2. return the round payload through the shared Playwright transport
3. normalize provider request errors the same way existing V2 providers do

### Task 2.2 - Add team persistence helpers [x]

Create:

```text
src/domains/data-provider-v2/persistence/team/list-teams-by-external-id.ts
src/domains/data-provider-v2/persistence/team/insert-teams.ts
```

Responsibilities:

1. list existing global teams by `provider + externalIds`
2. insert new teams only

### Task 2.3 - Add shared teams preparation helpers [x]

Create:

```text
src/domains/data-provider-v2/use-cases/teams/map-provider-teams.ts
src/domains/data-provider-v2/use-cases/teams/prepare-tournament-teams.ts
```

Responsibilities:

1. fetch eligible sources by tournament mode
2. map standings rows into team candidates
3. map knockout-round events into team candidates
4. dedupe team candidates across sources by `provider + externalId`
5. return:
   - candidate teams
   - provider source failures
   - invalid provider team rows

# Phase 3

## Goal

Implement the Team Create use-case with raw workflow facts only.

## Tasks

### Task 3.1 - Implement `run-tournament-teams-create.ts` [x]

Create:

```text
src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-create.ts
```

Responsibilities:

1. use `prepare-tournament-teams.ts`
2. resolve already-existing local teams
3. upload badges only for creatable teams
4. insert missing team rows
5. return raw workflow facts only

Rules:

1. do not build report `summary/details/data` here
2. do not own execution/report/Slack here

# Phase 4

## Goal

Wrap the Team Create use-case in the standard V2 operation envelope and cut over the admin route.

## Tasks

### Task 4.1 - Add teams-create operation files [x]

Create:

```text
src/domains/data-provider-v2/operations/teams-create/
├── execution-job-store.ts
├── report-builder.ts
├── report-uploader.ts
├── slack-notifier.ts
└── tournament-operation-runner.ts
```

Rules:

1. follow the proven V2 split:
   - use-case = raw facts
   - report-builder = `summary/details/data/status`
   - runner = execution lifecycle + report upload + Slack
2. reuse the already-shared report upload, execution store, and Slack skeleton helpers

### Task 4.2 - Cut over admin create teams [x]

Edit:

```text
src/domains/admin/services/teams.ts
```

Target behavior:

1. `POST /api/v2/admin/tournaments/:tournamentId/teams`
   - uses the V2 runner
2. keep the top-level HTTP shape:
   - `success`
   - `data: { teams: ... }`
   - success message
3. if the V2 operation status is not `completed`
   - return `422`

# Phase 5

## Goal

Verify the Team Create slice end to end before starting Team Update implementation.

## Tasks

### Task 5.1 - Static verification [x]

Run:

1. targeted `yarn eslint`
2. `yarn compile`

### Task 5.2 - Functional verification [ ]

Manually verify:

1. `POST /api/v2/admin/tournaments/:tournamentId/teams`
2. regular-season-only tournament
3. knockout-only tournament
4. regular-season-and-knockout tournament
5. create rerun against already-existing teams
6. execution job row
7. uploaded report
8. Slack notification
