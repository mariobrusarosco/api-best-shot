# Phase 1

## Goal

Freeze the V2 implementation contract for `sync-open-matches` before writing runtime code.

## Tasks

### Task 1 - Define the implementation boundary [x]
#### Task 1.1 - Lock the V2 file map for this workflow only [x]
#### Task 1.2 - Define V2-local contracts for provider errors, match outcomes, summaries, and operation envelope [x]
#### Task 1.3 - Decide the cutover entrypoint for V2 (`new target` vs `replace existing target`) [x]

## Dependencies

- [ADR-005](/Users/mariobrusarosco/coding/api-best-shot/docs/adr/005-data-provider-v2-architecture.md)
- [sync-open-matches design](/Users/mariobrusarosco/coding/api-best-shot/docs/plans/data-provider-v2-sync-open-matches-design.md)

## Decision Notes

- V2 will be exposed behind a new scheduler target instead of replacing the current V1 target.
- The chosen target for the first V2 vertical slice is `matches.sync_ended`.
- This keeps V1 and V2 operationally separable during validation and makes rollback trivial.
- The scheduler integration phase must preserve that separation and must not route `matches.sync_ended` back into V1 orchestration.

## Locked File Map

This vertical slice is allowed to create only the following V2 workflow files:

```text
src/domains/data-provider-v2/
├── contracts/
│   ├── errors.ts
│   └── open-match-sync.ts
├── transport/
│   └── playwright/
│       ├── runtime.ts
│       ├── browser-session.ts
│       └── browser-request.ts
├── providers/
│   └── sofascore/
│       ├── endpoints.ts
│       └── match-provider.ts
├── persistence/
│   └── open-match-sync/
│       ├── list-due-open-matches.ts
│       ├── update-match-from-polling.ts
│       └── touch-match-checked-at.ts
├── operations/
│   └── open-match-sync/
│       ├── execution-job-store.ts
│       ├── report-uploader.ts
│       ├── slack-notifier.ts
│       └── tournament-operation-runner.ts
└── use-cases/
    └── open-match-sync/
        ├── classify-match-sync-outcome.ts
        ├── run-tournament-open-match-sync.ts
        └── run-open-match-sync-batch.ts
```

Scheduler integration files are intentionally excluded from this map until Phase 6.

This slice explicitly does **not** create:

1. a new top-level `assets/` layer
2. a new top-level `notifications/` layer
3. a new top-level `reporting/` layer
4. `BaseScraperV2`
5. any V2 files for teams, standings, rounds, or tournaments yet

The purpose of this lock is to keep the first slice small while still proving the V2 architecture.

## Locked V2 Contracts

Task 1.2 freezes the contract surface for the first vertical slice before runtime code exists.

This slice will use only two contract files:

1. `src/domains/data-provider-v2/contracts/errors.ts`
2. `src/domains/data-provider-v2/contracts/open-match-sync.ts`

This slice will **not** introduce a separate `provider.ts` contract file.
The error contract stays generic enough to be reused later, while the workflow contract stays local to `open-match-sync`.

### 1. Provider Error Contract

`contracts/errors.ts` will define the provider-facing request error shape for V2.

For this slice, callers are allowed to depend on these fields only:

```ts
type ProviderRequestErrorContract = {
  name: 'ProviderRequestError';
  kind: 'provider_request_error';
  provider: 'sofascore';
  resource: 'match_event';
  message: string;
  requestUrl: string;
  requestIdentifier: string; // matchExternalId
  status?: number;
  causeMessage?: string;
  responseBodySnippet?: string;
};
```

Rules:

1. provider/request failures must cross the provider boundary as structured errors, not as raw Playwright strings
2. `requestIdentifier` is the external provider identifier, not an internal DB ID
3. `status === 404` must remain a provider fact only
4. neither transport nor provider code may decide whether `404` is expected
5. callers must not parse `message` to classify provider outcomes
6. low-level request diagnostics such as `responseBodySnippet` are allowed only when safely available and must stay transport/provider scoped

### 2. Open-Match Outcome Contract

`contracts/open-match-sync.ts` will define the workflow-local outcome vocabulary.

Per-match outcomes are locked to:

```ts
type OpenMatchSyncOutcome =
  | 'updated'
  | 'provider_status_not_ended'
  | 'provider_response_missing_event'
  | 'provider_match_not_found'
  | 'unexpected_failure';
```

Rules:

1. `provider_match_not_found` is the use-case classification for provider `404`
2. `provider_match_not_found` is expected and non-fatal
3. `provider_match_not_found` must not touch `lastCheckedAt`
4. `unexpected_failure` is reserved for true provider, persistence, or runtime failures that the use-case does not downgrade

### 3. Tournament Summary Contract

The tournament-scoped workflow result is the source of truth for:

1. execution-job summary
2. uploaded report summary
3. Slack summary

The summary contract is locked to:

```ts
type TournamentOpenMatchSyncSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  scannedMatches: number;
  updatedMatches: number;
  openMatches: number;
  endedMatches: number;
  providerNotFoundMatches: number;
  providerMissingEventMatches: number;
  unexpectedFailureMatches: number;
  updatedMatchIdsPreview?: string[];
  providerNotFoundMatchIdsPreview?: string[];
  unexpectedFailureMatchIdsPreview?: string[];
};
```

Interpretation rules:

1. `totalOperations` = number of tournament matches processed by the use-case
2. `successfulOperations` = processed matches that did not end as `unexpected_failure`
3. `failedOperations` = processed matches classified as `unexpected_failure`
4. `provider_match_not_found` counts as processed, not failed
5. the current admin UI compatibility requirement is preserved by keeping:
   - `totalOperations`
   - `successfulOperations`
   - `failedOperations`
6. preview fields are optional and bounded
7. preview fields must contain internal `matchId` values, not full detail objects
8. preview fields are for fast admin/debug visibility, not for full forensic detail

Preview list rule:

1. summary preview arrays must be capped at a small fixed size
2. recommended cap for this slice: `10`
3. anything beyond the cap belongs only in the uploaded report

### 4. Report Detail Contract

The uploaded report must keep the same summary contract and add detail buckets.

The report detail buckets are locked to:

1. `updated`
2. `providerStatusNotEnded`
3. `providerResponseMissingEvent`
4. `providerMatchNotFound`
5. `unexpectedFailures`

Each detail record may include:

```ts
type OpenMatchSyncDetail = {
  matchId: string;
  externalId: string;
  roundSlug?: string;
  requestUrl?: string;
  providerStatus?: string;
  reason: OpenMatchSyncOutcome;
  errorMessage?: string;
  responseBodySnippet?: string;
};
```

Rules:

1. expected provider misses belong in report details, not in error stacks
2. `requestUrl` is required when the outcome came from a provider request error
3. `roundSlug` belongs here because it is caller/use-case context, not provider context
4. report details are allowed to carry richer debugging fields than execution summaries

The report contract may also include full, unbounded ID collections such as:

```ts
type OpenMatchSyncReportData = {
  updatedMatchIds: string[];
  providerNotFoundMatchIds: string[];
  providerMissingEventMatchIds: string[];
  unexpectedFailureMatchIds: string[];
};
```

Full-list rule:

1. full ID collections belong in the uploaded report, not in the execution-job summary
2. if the workflow needs to answer "which matches failed?" completely, the report is the source of truth
3. execution summary may expose only bounded previews of those collections

### 5. Batch Summary Contract

`run-open-match-sync-batch.ts` will return a scheduler-facing batch summary.

The batch summary is locked to:

```ts
type OpenMatchSyncBatchSummary = {
  schedulerTarget: 'matches.sync_ended';
  scannedMatches: number;
  skippedInvalidMatches: number;
  tournamentsQueued: number;
  tournamentsCompleted: number;
  tournamentsFailed: number;
};
```

Rules:

1. batch summary is scheduler-facing and compact
2. batch summary must not dump raw per-match detail arrays
3. due matches missing `tournamentId` count under `skippedInvalidMatches`
4. tournament-scoped rich detail belongs in reports, not batch logs

### 5.1 Observability Enrichment Rule

Additional context is encouraged, but it must be added at the correct layer.

1. provider errors may carry request diagnostics only
2. use-case details may carry match-level workflow context such as `matchId` and `roundSlug`
3. execution summaries may carry bounded preview lists only
4. uploaded reports may carry full detail arrays and complete per-match records

This rule exists to keep:

1. provider contracts reusable
2. execution rows compact
3. reports comprehensive

### 6. Operation Envelope Contract

The first V2 operation will use:

1. scheduler target: `matches.sync_ended`
2. execution-job `operationType`: `matches_sync_open_v2`

This distinction is intentional:

1. `matches.sync_ended` is the rollout/cutover entrypoint
2. `matches_sync_open_v2` is the more accurate description of the underlying workflow

The tournament operation envelope is locked to:

```text
create execution job (status=in_progress)
-> run tournament open-match sync use-case
-> create and upload tournament report
-> complete or fail execution job with summary
-> send Slack notification
```

Execution-job persistence must write:

1. `requestId`
2. `tournamentId`
3. `operationType`
4. `status`
5. `startedAt`
6. `completedAt`
7. `duration`
8. `reportFileUrl`
9. `reportFileKey`
10. `summary`

Operation status rules:

1. tournament operation `completed` means the use-case finished without operation-level failure
2. tournament operation `failed` means the use-case raised an unrecovered failure or the operation envelope itself failed
3. expected per-match outcomes like `provider_match_not_found` do not fail the tournament operation by themselves

### 7. Admin Compatibility Rule

The current admin execution-jobs pages read only:

1. `operationType`
2. `status`
3. `summary.totalOperations`
4. `summary.successfulOperations`
5. `summary.failedOperations`
6. timestamps and report URL

Therefore V2 is allowed to enrich execution summaries, but it must not remove or rename those three summary keys.

## Expected Result

We have one frozen implementation boundary for the first V2 workflow, including:

1. the file map
2. the scheduler cutover entrypoint
3. the provider error contract
4. the outcome vocabulary
5. the tournament and batch summary contracts
6. the tournament operation envelope

## Next Steps

Phase 1 is complete.

After review, start Task 2.1.

# Phase 2

## Goal

Build the V2 Playwright transport foundation and the SofaScore match provider from scratch, with no imports from V1 data-provider code.

## Tasks

### Task 2 - Implement transport foundation []
#### Task 2.1 - Create `transport/playwright/` runtime and session primitives []
#### Task 2.2 - Create a generic browser-context JSON request primitive []
#### Task 2.3 - Preserve the hard constraint that SofaScore requests run through Playwright browser context []

### Task 3 - Implement provider foundation []
#### Task 3.1 - Create `providers/sofascore/endpoints.ts` for match event URL construction []
#### Task 3.2 - Create `providers/sofascore/match-provider.ts` for event fetching []
#### Task 3.3 - Normalize provider request failures into V2-local structured errors []

## Dependencies

- Phase 1 completed

## Expected Result

V2 can fetch a SofaScore match event through Playwright with a stable provider error contract and no V1 imports.

## Next Steps

After review, start Task 2.1.

# Phase 3

## Goal

Build the V2 persistence adapters required for `sync-open-matches`, including tournament-scoped execution-job writes against the existing DB contract.

## Tasks

### Task 4 - Implement match-state persistence []
#### Task 4.1 - Create V2 adapter to list due open matches with the required fields []
#### Task 4.2 - Create V2 adapter to update match state from polling []
#### Task 4.3 - Create V2 adapter to touch `lastCheckedAt` where the current design still requires it []

### Task 5 - Implement execution/report persistence adapters []
#### Task 5.1 - Create V2-local execution-job store against the existing `data_provider_executions` table []
#### Task 5.2 - Create V2-local report uploader for JSON operation artifacts []
#### Task 5.3 - Ensure V2 does not import V1 `execution.ts`, `report.ts`, or `file-storage.ts` []

## Dependencies

- Phase 2 completed

## Expected Result

V2 can read due matches, persist match updates, and persist execution/report metadata using V2-owned adapters only.

## Next Steps

After review, start Task 4.1.

# Phase 4

## Goal

Implement the domain workflow for `sync-open-matches` and keep business classification in V2 use-cases, not in provider or operations layers.

## Tasks

### Task 6 - Implement match outcome classification []
#### Task 6.1 - Create the V2 outcome set for open-match sync []
#### Task 6.2 - Classify provider `404` as `provider_match_not_found` in the use-case layer []
#### Task 6.3 - Preserve the rule that `provider_match_not_found` does not touch `lastCheckedAt` []

### Task 7 - Implement the workflow []
#### Task 7.1 - Create `run-tournament-open-match-sync.ts` []
#### Task 7.2 - Create `run-open-match-sync-batch.ts` with grouping by `tournamentId` []
#### Task 7.3 - Return compact workflow results that operations can turn into reports and execution summaries []

## Dependencies

- Phase 3 completed

## Expected Result

V2 can run the full domain workflow for one tournament and for one scheduler batch with stable outcome classification and no raw Playwright error leakage.

## Next Steps

After review, start Task 6.1.

# Phase 5

## Goal

Wrap the use-case in the required operation envelope: execution job, report upload, Slack notification, and final status handling.

## Tasks

### Task 8 - Implement operations envelope []
#### Task 8.1 - Create `execution-job-store.ts` behavior for start/complete/fail lifecycle []
#### Task 8.2 - Create `slack-notifier.ts` for tournament-scoped success/failure notifications []
#### Task 8.3 - Create `tournament-operation-runner.ts` that owns the run of the use-case []
#### Task 8.4 - Ensure the summary shape stays compatible with the current admin execution-jobs UI []

## Dependencies

- Phase 4 completed

## Expected Result

Each tournament-scoped V2 open-match sync run produces one execution job, one uploaded report, one Slack lifecycle, and one clear summary contract.

## Next Steps

After review, start Task 8.1.

# Phase 6

## Goal

Expose the first V2 workflow to the scheduler in a controlled way and verify the vertical slice end to end.

## Tasks

### Task 9 - Integrate V2 entrypoint []
#### Task 9.1 - Add the chosen V2 scheduler entrypoint/cutover path []
#### Task 9.2 - Keep scheduler-facing logs compact and batch-oriented []
#### Task 9.3 - Avoid importing V1 data-provider orchestration into the integration layer []

### Task 10 - Bounded verification []
#### Task 10.1 - Run `yarn compile` []
#### Task 10.2 - Review execution summary, report contract, and Slack payload shape manually []
#### Task 10.3 - Confirm the admin execution-jobs page can still read the V2 summary shape []

## Dependencies

- Phase 5 completed

## Expected Result

The first V2 workflow is callable, observable, and reviewable without dragging V1 internals into the implementation.

## Next Steps

After review, start Task 9.1.
