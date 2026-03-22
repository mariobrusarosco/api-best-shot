# Phase 0

## Goal

Lock the V2 implementation boundary for `Create standings for a tournament` before writing runtime code.

This slice is intentionally narrower than a full standings migration.

It covers only:

1. the admin-triggered **create standings** workflow
2. one tournament at a time
3. SofaScore-backed standings fetched through Playwright

It explicitly does **not** include standings update yet.

## Tasks

### Task 0.1 - Lock the workflow boundary [ ]

Rules:

1. This slice implements only the V2 equivalent of V1 `StandingsDataProviderService.init(...)`.
2. The active cutover target is the admin create action:
   - `POST /api/v2/admin/tournaments/:tournamentId/standings`
3. `PATCH /api/v2/admin/tournaments/:tournamentId/standings` remains on V1 for now.
4. This slice is tournament-scoped and manual/admin-triggered, not batch/scheduler-triggered.

### Task 0.2 - Lock the ownership boundaries [ ]

Stable ownership for this slice:

1. `transport/`
   - Playwright browser lifecycle
   - generic page navigation
   - generic page JSON extraction
2. `providers/sofascore/`
   - standings endpoint construction
   - provider-specific standings response access
   - provider request error normalization
3. `use-cases/standings/`
   - workflow orchestration
   - tournament-mode guardrails
   - mapping provider standings to DB insert rows
   - classification of missing teams / empty standings / provider outcomes
4. `persistence/standings/`
   - list teams by external ID
   - insert standings rows
5. `operations/standings-create/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation summary shaping

### Task 0.3 - Lock the explicit non-goals [ ]

Non-goals for this slice:

1. standings update
2. cron/scheduler integration
3. teams auto-creation
4. teams update
5. rounds or knockout-round sync
6. generic shared standings framework
7. changing how standings are read/rendered in the tournament domain
8. changing `standingsMode` semantics
9. changing the DB schema for `tournament_standings`

## Decision Notes

### Knockout-only rule

V1 `standings.ts` is not explicit about `knockout-only` tournaments.
It still attempts `${baseUrl}/standings/total`.

However, the wider V1 subsystem is explicit that `knockout-only` tournaments should not depend on standings:

- [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts)

V2 will therefore make this rule explicit:

1. `mode = 'knockout-only'` is not eligible for standings creation
2. the V2 use-case will stop early with a clear domain error
3. V2 will not attempt to scrape `/standings/total` for knockout-only tournaments

### Future update seam

Even though this slice is create-only, the lower layers should be shaped so that standings update can reuse them later.

That means:

1. provider logic should be standings-generic, not create-specific
2. mapping logic should be standings-generic, not create-specific
3. team lookup should be standings-generic, not create-specific
4. only the operation runner and write strategy stay create-specific for now

This preserves the stable V2 approach without forcing a premature generic framework.

## Locked File Map

This slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   └── standings.ts
├── transport/
│   └── playwright/
│       └── browser-page-json.ts
├── providers/
│   └── sofascore/
│       └── standings-provider.ts
├── persistence/
│   └── standings/
│       ├── list-teams-by-external-id.ts
│       └── insert-tournament-standings.ts
├── operations/
│   └── standings-create/
│       ├── execution-job-store.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── standings/
        ├── map-provider-standings.ts
        └── run-tournament-standings-create.ts
```

This slice may also edit the following integration file:

```text
src/domains/admin/services/standings.ts
```

This slice explicitly does **not** create:

1. a new scheduler target
2. a V2 standings update runner
3. a V2 standings batch runner
4. a new top-level `notifications/` layer
5. a new top-level `reporting/` layer
6. a new top-level `assets/` layer

## Locked Browser-Lifetime Rule

This workflow is single-operation, not batch-driven.

So the browser lifetime rule for this slice is:

```text
one standings-create operation
-> one runtime/browser
-> one session/context/page
-> one provider use-case execution
-> close once at the end
```

This is the conservative default and matches the V2 browser-lifetime rules already documented.

# Phase 1

## Goal

Freeze the V2 contract surface for standings create before runtime code exists.

## Tasks

### Task 1.1 - Define the standings workflow contract [ ]

Create:

```text
src/domains/data-provider-v2/contracts/standings.ts
```

This contract should define:

1. provider standings payload types needed by this workflow
2. mapped standings row input shape
3. create-standings summary contract
4. create-standings report detail contract
5. create-standings workflow status
6. create-standings report upload result contract

### Task 1.2 - Define the create-standings outcome vocabulary [ ]

The create standings workflow should use explicit local outcomes rather than loose messages.

Recommended outcome vocabulary:

```ts
type StandingsCreateOutcome =
  | 'created'
  | 'tournament_mode_not_supported'
  | 'provider_response_missing_standings'
  | 'provider_team_not_found_in_db'
  | 'unexpected_failure';
```

Rules:

1. `tournament_mode_not_supported` is the V2 rule for `knockout-only`
2. `provider_response_missing_standings` means the provider payload did not contain usable standings rows
3. `provider_team_not_found_in_db` means a provider standings row referenced a team we do not have locally
4. `unexpected_failure` is reserved for true transport/provider/persistence/runtime failures that are not downgraded

### Task 1.3 - Lock the summary contract [ ]

The tournament-scoped summary should remain compatible with the current execution-jobs admin read path by keeping:

1. `totalOperations`
2. `successfulOperations`
3. `failedOperations`

Recommended standings-create summary shape:

```ts
type TournamentStandingsCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedGroups: number;
  fetchedRows: number;
  createdRows: number;
  missingTeamsCount: number;
  providerMissingStandingsCount: number;
  updatedMatchIdsPreview?: never;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};
```

Interpretation rules:

1. `totalOperations` = number of provider standings rows processed
2. `successfulOperations` = standings rows successfully mapped and inserted
3. `failedOperations` = standings rows that could not be completed
4. `createdRows` = number of rows inserted into `tournament_standings`
5. `missingTeamsCount` = number of provider rows blocked by unresolved team references
6. `providerMissingStandingsCount` = `1` when the provider returned no standings payload for this operation, otherwise `0`

### Task 1.4 - Lock the report detail contract [ ]

Recommended detail buckets:

1. `created`
2. `missingTeams`
3. `providerMissingStandings`
4. `unsupportedTournamentMode`
5. `unexpectedFailures`

This report should be the forensic artifact for:

1. which rows were created
2. which teams were missing
3. whether the tournament mode blocked the operation
4. whether provider standings were absent

# Phase 2

## Goal

Implement the transport/provider path for standings page JSON extraction without changing the mechanism V1 already proved.

## Tasks

### Task 2.1 - Add a generic browser page JSON helper [ ]

Create:

```text
src/domains/data-provider-v2/transport/playwright/browser-page-json.ts
```

This helper should own only:

1. `page.goto(url)`
2. extracting JSON from `<pre>` or `document.body`
3. transport-level navigation/content errors

It must not own:

1. SofaScore endpoint knowledge
2. standings semantics
3. tournament-mode decisions

### Task 2.2 - Add the SofaScore standings provider [ ]

Create:

```text
src/domains/data-provider-v2/providers/sofascore/standings-provider.ts
```

This provider should:

1. build `${baseUrl}/standings/total`
2. call the generic browser page JSON helper
3. normalize provider request failures into the V2 provider error contract
4. return the raw standings payload needed by the use-case

Important rule:

1. do **not** switch this slice to a different transport mechanism just because matches use browser-context `fetch(...)`
2. standings should preserve the proven V1 mechanism unless we explicitly redesign it later

# Phase 3

## Goal

Implement the standings-create domain workflow and persistence path.

## Tasks

### Task 3.1 - Add standings persistence helpers [ ]

Create:

```text
src/domains/data-provider-v2/persistence/standings/list-teams-by-external-id.ts
src/domains/data-provider-v2/persistence/standings/insert-tournament-standings.ts
```

Responsibilities:

1. list teams by provider external ID
2. insert standings rows

Rules:

1. persistence should not decide whether a missing team is fatal
2. persistence should not know tournament mode rules

### Task 3.2 - Add standings row mapping [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/standings/map-provider-standings.ts
```

Responsibilities:

1. extract provider team external IDs
2. resolve local teams
3. map provider standings rows into DB insert rows
4. collect missing-team details

Rules:

1. teams remain a hard prerequisite for this create workflow
2. this slice does **not** create teams automatically
3. mapping should preserve:
   - `groupName`
   - `order`
   - `shortName`
   - `longName`
   - points/games/wins/draws/losses/gf/ga/gd

### Task 3.3 - Add the standings-create use-case [ ]

Create:

```text
src/domains/data-provider-v2/use-cases/standings/run-tournament-standings-create.ts
```

Responsibilities:

1. load tournament context from caller input
2. reject `knockout-only` tournaments early
3. fetch provider standings
4. map standings
5. insert standings
6. return explicit summary, details, and workflow status

Rules:

1. `standingsMode` affects read-side rendering only and must not change write semantics here
2. `knockout-only` should end as a clear, explainable workflow outcome
3. missing teams should be explicit in the report

# Phase 4

## Goal

Add the operational envelope for tournament-scoped standings create.

## Tasks

### Task 4.1 - Add execution-job store [ ]

Create:

```text
src/domains/data-provider-v2/operations/standings-create/execution-job-store.ts
```

Rules:

1. create the `in_progress` row
2. finalize as `completed`, `partial_failure`, or `failed`
3. preserve current admin summary compatibility

### Task 4.2 - Add report upload and Slack notification [ ]

Create:

```text
src/domains/data-provider-v2/operations/standings-create/report-uploader.ts
src/domains/data-provider-v2/operations/standings-create/slack-notifier.ts
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

### Task 4.3 - Add the tournament operation runner [ ]

Create:

```text
src/domains/data-provider-v2/operations/standings-create/tournament-operation-runner.ts
```

Responsibilities:

1. create execution job
2. create runtime/session
3. run the standings-create use-case
4. build/upload report
5. finalize execution job
6. send Slack
7. close session/runtime

This runner should be workflow-specific and should not try to become a generic standings framework.

# Phase 5

## Goal

Wire the admin create endpoint to the new V2 standings-create operation.

## Tasks

### Task 5.1 - Switch admin create standings to V2 [ ]

Edit:

```text
src/domains/admin/services/standings.ts
```

Target behavior:

1. `createStandings` calls the V2 operation runner
2. `updateStandings` stays on V1
3. response shape remains stable for admin callers

### Task 5.2 - Keep the cutover explicit [ ]

Rules:

1. do not silently route update standings into V2
2. do not change cron behavior
3. this cutover is manual/admin-create only

# Phase 6

## Goal

Verify V2 standings-create behavior against the current product expectations.

## Tasks

### Task 6.1 - Compile verification [ ]

Run:

```text
yarn compile
```

### Task 6.2 - Functional verification on supported tournament modes [ ]

Verify:

1. one `regular-season-only` tournament
2. one `regular-season-and-knockout` tournament

Expected:

1. standings rows are created
2. tournament read path still renders correctly
3. execution summary is compatible with admin execution-jobs UI

### Task 6.3 - Explicit knockout-only behavior verification [ ]

Verify:

1. `knockout-only` tournament does not attempt standings scraping
2. the operation fails or exits with a clear report/Slack explanation
3. the behavior is intentional and observable, not accidental

### Task 6.4 - Report and Slack verification [ ]

Verify:

1. report includes raw provider data or equivalent useful artifact payload
2. report clearly identifies missing teams when they block creation
3. Slack wording matches the final workflow status

## Final Notes

This plan intentionally keeps:

1. the operation runner approach stable
2. the lower-layer standings logic reusable for future update work
3. the current slice narrow enough to review safely

The next logical slice after this one is:

1. `Update standings`

That future slice should reuse:

1. transport
2. provider
3. mapping
4. team lookup

and change mainly:

1. write strategy
2. execution operation type
3. admin integration target
