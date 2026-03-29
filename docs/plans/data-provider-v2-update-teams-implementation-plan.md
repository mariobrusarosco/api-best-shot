# Phase 0

## Goal

Lock the V2 implementation boundary for `Update teams for a tournament` before writing runtime code.

This slice is intentionally narrower than a full team-maintenance migration.

It covers only:

1. the admin-triggered **update teams** workflow
2. one tournament at a time
3. SofaScore-backed team discovery through the shared V2 Playwright transport
4. upsert of global `team` rows discovered from one tournament context

It explicitly does **not** include a public batch API, scheduler work, or changes to Team Create.

## Tasks

### Task 0.1 - Lock the workflow boundary [ ]

Rules:

1. This slice implements only the V2 equivalent of V1 `TeamsDataProviderService.update(...)`.
2. The active cutover target is:
   - `PATCH /api/v2/admin/tournaments/:tournamentId/teams`
3. The route `tournamentId` identifies the discovery context, not team ownership.
4. Persisted team rows remain global by:
   - `provider + externalId`
5. update is explicitly allowed to create newly discovered global team rows via upsert
6. this slice is manual/admin-triggered, not batch/scheduler-triggered

### Task 0.2 - Lock the ownership boundaries [ ]

Stable ownership for this slice:

1. `transport/`
   - reuse the shared V2 Playwright runtime/session path
   - reuse the shared browser-backed asset upload primitive
2. `providers/sofascore/`
   - reuse the existing standings provider
   - reuse the new shared round provider introduced for Team Create
3. `use-cases/teams/`
   - reuse the shared teams preparation path
   - upload badges for discovered teams
   - upsert global team rows
   - return raw workflow facts
4. `persistence/team/`
   - reuse existing team lookup by `provider + externalId`
   - add update-specific upsert write strategy
5. `operations/teams-update/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [ ]

Non-goals for this slice:

1. changing the Team Create workflow
2. creating a public batch API
3. scheduler or cron integration
4. rounds create/update
5. matches create/update
6. standings create/update changes
7. changing the `team` schema
8. building a generic cross-workflow “team sync engine”

## Decision Notes

### Update orchestration choice

Three directions were considered:

1. single-operation update only
   - chosen
2. internal batch core like standings update
   - rejected for now because there is no proven batch caller yet
3. public batch admin endpoint
   - rejected because the current admin interaction is still resource-shaped

This plan explicitly chooses **Option 1**.

### Update write-strategy choice

Three directions were considered:

1. exact V1 semantics
   - badge upload for every discovered team
   - upsert every discovered team
   - chosen
2. conditional badge refresh only for missing badges or newly discovered teams
   - rejected for this first slice because it changes the meaning of explicit update too early
3. metadata-only upsert without badge refresh
   - rejected because update is our explicit refresh workflow

This plan explicitly chooses **Option 1**.

Why:

1. closest behavioral match to V1
2. clear distinction from Team Create
3. simpler first cutover

### Missing-source rule

Use the same source interpretation as Team Create:

1. all eligible sources missing or unusable
   - workflow fails
2. at least one eligible source succeeded, but another failed
   - workflow may complete as `partial_failure`
3. newly discovered teams created during update are valid outcomes
   - not failures

### Browser-lifetime rule

This workflow is still single-operation, not batch-driven.

So the browser lifetime rule is:

```text
one teams-update operation
-> one runtime/browser
-> one session/context/page
-> provider fetches + badge uploads
-> close once at the end
```

## Locked File Map

This slice is allowed to create only the following update-specific V2 files:

```text
src/domains/data-provider-v2/
├── persistence/
│   └── team/
│       └── upsert-teams.ts
├── operations/
│   └── teams-update/
│       ├── execution-job-store.ts
│       ├── report-builder.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── teams/
        └── run-tournament-teams-update.ts
```

This slice may also edit the following files introduced or reused by Team Create:

```text
src/domains/data-provider-v2/contracts/teams.ts
src/domains/data-provider-v2/providers/sofascore/round-provider.ts
src/domains/data-provider-v2/use-cases/teams/map-provider-teams.ts
src/domains/data-provider-v2/use-cases/teams/prepare-tournament-teams.ts
src/domains/admin/services/teams.ts
```

This slice explicitly does **not** create:

1. a new transport path
2. a public batch admin endpoint
3. a scheduler target
4. a generic shared teams runner across create and update

# Phase 1

## Goal

Extend the shared teams contract for update-specific semantics.

## Tasks

### Task 1.1 - Extend `contracts/teams.ts` for update [ ]

Edit:

```text
src/domains/data-provider-v2/contracts/teams.ts
```

Add:

1. `TeamsUpdateOutcome`
2. `TournamentTeamsUpdateSummary`
3. `TeamsUpdateDetail`
4. `TournamentTeamsUpdateDetails`
5. `TeamsUpdateReportData`
6. `TeamsUpdateWorkflowStatus`
7. `TournamentTeamsUpdateWorkflowResult`
8. `TeamsUpdateReport`

### Task 1.2 - Lock the update outcome vocabulary [ ]

Recommended update outcome vocabulary:

```ts
type TeamsUpdateOutcome =
  | 'updated'
  | 'created_during_update'
  | 'provider_source_missing_teams'
  | 'provider_team_payload_invalid'
  | 'asset_upload_failed'
  | 'database_upsert_failed'
  | 'unexpected_failure';
```

Rules:

1. `updated` means an existing global team row was refreshed
2. `created_during_update` means update discovered and inserted a missing global team row
3. `provider_source_missing_teams` means an eligible provider source returned no usable teams
4. `provider_team_payload_invalid` means a provider team row was missing required identifiers or names
5. `asset_upload_failed` means badge upload failed before DB upsert completed
6. `database_upsert_failed` means the upsert write step failed

### Task 1.3 - Lock the update summary contract [ ]

Recommended summary shape:

```ts
type TournamentTeamsUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedSources: number;
  fetchedTeams: number;
  upsertedTeams: number;
  createdTeams: number;
  updatedTeams: number;
  uploadedAssets: number;
  providerMissingSourcesCount: number;
  invalidProviderTeamsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

### Task 1.4 - Lock the update detail buckets [ ]

Recommended detail buckets:

1. `upserted`
2. `providerMissingSources`
3. `invalidProviderTeams`
4. `assetUploadFailures`
5. `databaseFailures`
6. `unexpectedFailures`

### Task 1.5 - Lock the workflow status rule [ ]

Recommended workflow status:

```ts
type TeamsUpdateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';
```

# Phase 2

## Goal

Add the update-specific lower layer and the raw update use-case.

## Tasks

### Task 2.1 - Add `upsert-teams.ts` [ ]

Create:

```text
src/domains/data-provider-v2/persistence/team/upsert-teams.ts
```

Responsibility:

1. upsert global team rows by `provider + externalId`
2. return enough write facts to distinguish:
   - created during update
   - updated

### Task 2.2 - Implement `run-tournament-teams-update.ts` [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/teams/run-tournament-teams-update.ts
```

Responsibilities:

1. reuse `prepare-tournament-teams.ts`
2. upload badges for discovered teams
3. upsert discovered teams
4. return raw workflow facts only

Rules:

1. do not build report `summary/details/data` here
2. do not own execution/report/Slack here

# Phase 3

## Goal

Wrap Team Update in the standard V2 operation envelope and cut over the admin route.

## Tasks

### Task 3.1 - Add teams-update operation files [ ]

Create:

```text
src/domains/data-provider-v2/operations/teams-update/
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

### Task 3.2 - Cut over admin update teams [ ]

Edit:

```text
src/domains/admin/services/teams.ts
```

Target behavior:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/teams`
   - uses the V2 runner
2. keep the top-level HTTP shape:
   - `success`
   - `data: { teams: ... }`
   - success message
3. if the V2 operation status is not `completed`
   - return `422`

# Phase 4

## Goal

Verify Team Update end to end after Team Create is already in place.

## Tasks

### Task 4.1 - Static verification [ ]

Run:

1. targeted `yarn eslint`
2. `yarn compile`

### Task 4.2 - Functional verification [ ]

Manually verify:

1. `PATCH /api/v2/admin/tournaments/:tournamentId/teams`
2. update against existing teams
3. update discovering one or more missing global teams
4. hybrid tournament with one missing source
5. execution job row
6. uploaded report
7. Slack notification
