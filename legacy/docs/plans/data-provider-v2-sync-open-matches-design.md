# Data Provider V2: Sync Open Matches Design

## Goal

Define the first concrete V2 workflow to implement:

`sync-open-matches`

This document translates the V2 ADR into an actionable design for the first use case, without writing code yet.

## Why This Is The First Workflow

`sync-open-matches` is the right first V2 workflow because:

1. it is the current operational pain point
2. it exercises the SofaScore request path directly
3. it needs the full operation envelope:
   - execution job
   - report
   - Slack notification
4. it requires a stable provider error contract
5. it is the workflow currently producing noisy logs and unclear summaries

## Hard Constraints

These are fixed for this workflow:

1. **Playwright is mandatory**
   - Direct non-browser `fetch()` to SofaScore is a known `403` path.
   - Match-event requests must run in browser context through Playwright.
2. **Execution jobs are tournament-scoped**
   - A tournament’s open-match sync results must be traceable under that tournament in admin.
3. **Every tournament operation must create a report and attempt upload**
   - Upload outcome must be observable.
4. **Every tournament operation must send Slack notifications**
5. **V2 must not import anything from `src/domains/data-provider/**`**

## Scope

In scope:

1. query due open SofaScore matches
2. group them by tournament
3. fetch provider match data through Playwright
4. classify outcomes with stable contracts
5. persist match updates
6. persist tournament-scoped execution jobs
7. create and attempt upload of per-tournament reports
8. send per-tournament Slack notifications
9. return batch-level summary for scheduler use

Out of scope:

1. schema redesign for match polling state
2. suppression/recovery workflow for provider-missing matches
3. standings refresh redesign
4. direct single-match update V2
5. rounds/teams/standings/tournament V2 workflows

## Key Design Decision

The scheduler-triggered workflow is **batch-scoped**, but the operational unit is **tournament-scoped**.

That means:

1. scheduler runs one batch
2. batch finds due matches across tournaments
3. batch groups matches by `tournamentId`
4. each tournament group becomes one independent V2 operation
5. each tournament operation creates:
   - one execution job
   - one report
   - one Slack notification lifecycle

This is the only design that matches the current admin monitoring requirement.

## V2 Module Map

Recommended file map:

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
│       ├── match-provider.ts
│       └── normalize-match-response.ts
├── persistence/
│   └── open-match-sync/
│       ├── list-due-open-matches.ts
│       ├── update-match-from-polling.ts
│       ├── touch-match-checked-at.ts
│       └── list-tournament-refresh-targets.ts
├── operations/
│   ├── tournament-operation-runner.ts
│   ├── execution-job-store.ts
│   ├── report-uploader.ts
│   └── slack-notifier.ts
├── use-cases/
│   └── open-match-sync/
│       ├── run-open-match-sync-batch.ts
│       ├── run-tournament-open-match-sync.ts
│       └── classify-match-sync-outcome.ts
└── typing.ts
```

For the first vertical slice, the contract surface is intentionally limited to:

1. `contracts/errors.ts`
2. `contracts/open-match-sync.ts`

No separate `contracts/provider.ts` file is planned for this slice.

## Runtime Architecture

### 1. Transport Layer

Recommended shape:

- `PlaywrightRuntime`
  - owns browser startup/shutdown
- `BrowserSession`
  - one isolated page/context per tournament operation
- `BrowserRequest`
  - generic browser-context JSON request primitive

Important rule:

- The transport layer must not know what a match is.
- It only knows how to execute browser-context requests safely.

### 2. SofaScore Provider Layer

Recommended shape:

- `SofaScoreEndpoints`
  - builds event URL from `matchExternalId`
- `SofaScoreMatchProvider`
  - requests event payload through `BrowserRequest`
  - returns normalized provider data
  - throws structured provider request errors

Important rule:

- This layer knows SofaScore.
- It does not know cron semantics, admin semantics, or tournament execution-job semantics.

### 3. Use-Case Layer

Recommended shape:

- `runOpenMatchSyncBatch`
  - orchestration entrypoint for scheduler
  - groups matches by tournament
  - invokes one tournament operation per group
- `runTournamentOpenMatchSync`
  - core tournament-scoped workflow
  - processes all due matches for one tournament

### 4. Operations Layer

Recommended shape:

- `TournamentOperationRunner`
  - creates execution job
  - runs tournament use case
  - attempts report upload
  - records report upload outcome
  - completes/fails execution job
  - sends Slack notification

This layer guarantees the operational contract.

## Core Flow

### Batch Flow

```text
scheduler cron target
-> runOpenMatchSyncBatch
-> query due open matches
-> group by tournamentId
-> for each tournament group:
   -> TournamentOperationRunner.run(...)
-> return batch summary
```

### Tournament Flow

```text
create execution job
-> create isolated browser session
-> for each due match in tournament:
   -> fetch SofaScore event through provider layer
   -> classify outcome
   -> persist when needed
   -> collect summary/details
-> build report
-> attempt report upload
-> complete or fail execution job
-> send Slack notification
```

## Query and Grouping Rules

The batch entrypoint should query due matches using a V2 persistence adapter backed by the existing match domain query layer.

Required fields per match:

1. `id`
2. `externalId`
3. `tournamentId`
4. `roundSlug`
5. `provider`
6. `date`
7. `status`

Batch grouping rule:

- `group by tournamentId`

If a due match is missing `tournamentId`:

1. do not process it in V2 tournament flow
2. record it in batch-level invalid input summary
3. do not create a tournament-scoped execution job for it

## Provider Contract

The provider layer should expose a method like:

```ts
fetchMatchEvent(input: { matchExternalId: string; session: BrowserSession }): Promise<SofaScoreMatchEventPayload>
```

Behavior:

1. build `https://www.sofascore.com/api/v1/event/{matchExternalId}`
2. execute request in browser context through Playwright
3. parse JSON
4. throw structured `ProviderRequestError` on non-OK responses or malformed provider payloads

## Error Contract

The workflow needs stable error types at minimum:

1. `TransportError`
2. `ProviderRequestError`
3. `PersistenceError`
4. `OpenMatchSyncError`

`ProviderRequestError` must carry:

1. `provider`
2. `requestUrl`
3. `requestIdentifier`
4. `status` when known
5. `cause` when available

Example:

```ts
type ProviderRequestError = Error & {
  provider: 'sofascore';
  requestUrl: string;
  requestIdentifier: string;
  status?: number;
  cause?: unknown;
};
```

String parsing such as:

```ts
error.message.includes('Received status 404')
```

is explicitly forbidden in V2.

## Match Outcome Classification

For `sync-open-matches`, the use case should classify each match into one of these outcomes:

1. `updated`
2. `provider_status_not_ended`
3. `provider_response_missing_event`
4. `provider_match_not_found`
5. `unexpected_failure`

Recommended rules:

### `updated`

- provider returned event
- mapped status is `ended`
- DB update succeeded

### `provider_status_not_ended`

- provider returned event
- mapped status is not `ended`
- this is not an error

### `provider_response_missing_event`

- provider response is syntactically successful
- expected `event` payload is missing
- this is operationally notable, but not a transport failure

### `provider_match_not_found`

- provider returned `404`
- this is expected for this workflow
- this must not be logged as an application error

### `unexpected_failure`

- non-404 provider error
- malformed provider response that breaks normalization
- persistence failure
- unexpected runtime error

## Persistence Rules

This workflow uses the current database shape.

That means:

1. ended matches update scores/status through the existing match polling update path
2. non-ended matches may still update `lastCheckedAt` through the current checked-at mechanism
3. `provider_match_not_found` must **not** update `lastCheckedAt`

Known limitation:

- this preserves the current polling-state debt until a separate schema redesign happens

## Execution Job Contract

Each tournament operation must create one execution job row with:

1. `requestId`
2. `tournamentId`
3. `operationType`
4. `status = in_progress`
5. `startedAt`

Recommended operation type:

`matches_sync_open_v2`

Reason:

1. explicit separation from V1 during coexistence
2. works with the current execution schema because `operationType` is free text

On completion/failure, the job must store:

1. `status`
2. `completedAt`
3. `duration`
4. `reportFileUrl`
5. `reportFileKey`
6. `summary`

## Summary Contract

The execution-job summary must remain compatible with the current admin UI expectation while adding richer V2 data.

The current admin UI reads:

1. `totalOperations`
2. `successfulOperations`
3. `failedOperations`

Therefore V2 summary must include at minimum:

```ts
{
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
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
}
```

Recommended interpretation:

1. `totalOperations` = number of matches processed in that tournament operation
2. `successfulOperations` = matches processed without unexpected failure
3. `failedOperations` = matches classified as `unexpected_failure`

Expected-provider outcomes such as `provider_match_not_found` count as processed, not failed.

Report upload interpretation:

1. `reportUploadStatus = 'uploaded'` means the report artifact reached S3 successfully
2. `reportUploadStatus = 'failed'` means the report artifact could not be uploaded
3. report upload failure does not by itself turn a successful domain operation into a failed domain operation
4. `reportAvailable` controls whether Slack/admin can safely expose a report link

Summary preview rule:

1. execution-job summary may include small preview ID lists for fast debugging
2. preview lists must be capped
3. recommended cap for this slice: `10`
4. full collections must not be stored in the execution summary

## Report Contract

Each tournament operation must produce a detailed report artifact and attempt upload.

The report should contain:

1. operation metadata
2. tournament metadata
3. execution timing
4. summary counts
5. per-match detail lines

Recommended detail buckets:

1. `updated`
2. `providerStatusNotEnded`
3. `providerResponseMissingEvent`
4. `providerMatchNotFound`
5. `unexpectedFailures`

Each detail record should include when available:

1. `matchId`
2. `externalId`
3. `roundSlug`
4. `requestUrl`
5. `providerStatus`
6. `reason`
7. `errorMessage`
8. `responseBodySnippet`

The report may also include full ID collections such as:

1. `updatedMatchIds`
2. `providerNotFoundMatchIds`
3. `providerMissingEventMatchIds`
4. `unexpectedFailureMatchIds`

Report detail rule:

1. the report artifact is the source of truth for full detail lists
2. if we need to answer "which exact matches were affected?", the report should answer that completely
3. execution summary should expose only counts and bounded previews

If report upload fails:

1. the operation still keeps its in-memory report artifact
2. Slack must clearly say that the report is unavailable
3. an observable error signal must be emitted for debugging

## Slack Contract

Slack notification belongs to the tournament operation envelope, not the provider layer.

Slack message should include:

1. tournament label
2. operation type
3. final status
4. compact counts from summary
5. report URL when available
6. request ID

Expected provider misses must not produce failure notifications by themselves.
Only tournament operations with `unexpected_failure` outcomes should fail.

If report upload fails but the domain workflow succeeds:

1. Slack should still report the operation as successful
2. Slack should replace the report link with an explicit "report unavailable" indicator

## Logging Rules

Logging should follow these rules:

1. expected provider `404` is not an error log
2. provider `404` gets recorded in the report details and summary counts
3. unexpected provider/persistence/runtime failures are error logs with structured metadata
4. batch-level scheduler output should summarize tournament operations, not dump raw internal objects
5. successful report upload should emit an audit-style success signal
6. failed report upload should emit an error signal with request/tournament/report context

Observability layering rule:

1. provider errors may carry request diagnostics such as `responseBodySnippet`
2. use-case/report details may carry match workflow context such as `matchId` and `roundSlug`
3. execution summaries stay compact

## Playwright Session Strategy

Recommended strategy:

1. create one browser runtime per batch invocation
2. create one isolated session/context per tournament operation
3. close each tournament session after its operation completes
4. close the batch runtime after all tournament operations complete

Why:

1. lower browser-launch overhead than one browser per tournament
2. better isolation than sharing one page/context across all tournaments
3. clean boundary for tournament-scoped execution jobs and reports

## Integration Point With Scheduler

The scheduler should not know provider details.

It should only call a V2 batch entrypoint, for example:

`runOpenMatchSyncBatch()`

The batch entrypoint returns a scheduler-facing summary such as:

1. tournaments processed
2. tournaments succeeded
3. tournaments failed
4. tournaments refreshed
5. invalid matches skipped

This summary is for scheduler logs only.  
Detailed operational visibility remains in execution jobs and report artifacts.

## Explicit Non-Goals

This design does not solve:

1. long-term polling-state redesign
2. direct single-match update V2
3. standings refresh V2
4. admin UI redesign
5. queue-based parallelization

## Next Step

Before implementation, produce one final execution plan for this workflow only:

1. exact file list
2. exact interfaces
3. implementation order
4. cut points for review after each step
