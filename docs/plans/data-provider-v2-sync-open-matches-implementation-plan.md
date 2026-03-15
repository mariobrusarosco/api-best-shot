# Phase 1

## Goal

Freeze the V2 implementation contract for `sync-open-matches` before writing runtime code.

## Tasks

### Task 1 - Define the implementation boundary []
#### Task 1.1 - Lock the V2 file map for this workflow only []
#### Task 1.2 - Define V2-local contracts for provider errors, match outcomes, summaries, and operation envelope []
#### Task 1.3 - Decide the cutover entrypoint for V2 (`new target` vs `replace existing target`) [x]

## Dependencies

- [ADR-005](/Users/mariobrusarosco/coding/api-best-shot/docs/adr/005-data-provider-v2-architecture.md)
- [sync-open-matches design](/Users/mariobrusarosco/coding/api-best-shot/docs/plans/data-provider-v2-sync-open-matches-design.md)

## Decision Notes

- V2 will be exposed behind a new scheduler target instead of replacing the current V1 target.
- The chosen target for the first V2 vertical slice is `matches.sync_ended`.
- This keeps V1 and V2 operationally separable during validation and makes rollback trivial.
- The scheduler integration phase must preserve that separation and must not route `matches.sync_ended` back into V1 orchestration.

## Expected Result

We have one frozen implementation boundary for the first V2 workflow, including the only open integration decision: how the scheduler reaches V2.

## Next Steps

After review, start Task 1.1.

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
