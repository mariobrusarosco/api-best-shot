# Phase 0

## Goal

Lock the architecture boundary between shared Playwright scraping infrastructure and match-specific caller logic before any implementation work starts.

## Tasks

### Task 0 - Define scraper vs caller responsibilities []
#### Task 0.1 - Confirm that `src/domains/data-provider/providers/playwright/base-scraper.ts` remains shared infrastructure only [x]
#### Task 0.2 - Define the error contract that `BaseScraper.getMatchData()` may expose without embedding match business rules [x]
#### Task 0.3 - Explicitly assign `404` classification, readable operational logging, and cron summary ownership to caller layers [x]
#### Task 0.4 - Record non-goals for this pass so the implementation does not drift into suppression cron or schema redesign [x]

## Decision Notes

- Confirmed from the current code that `BaseScraper` owns shared browser/page lifecycle, generic navigation, page content extraction, match-data fetch execution, and asset-fetch/upload utilities.
- Confirmed that `BaseScraper` is used by multiple caller services, including open-match polling and direct single-match update, so cron-specific or match-business semantics do not belong there.
- Confirmed that business context such as `roundSlug`, `tournamentId`, sync outcome meaning, and cron/audit semantics only exist in caller layers and therefore must stay outside the shared scraper.
- Confirmed that the scraper error contract should stay transport-level and align with the existing shared `ApiError` pattern already present in `src/domains/shared/error-handling/types.ts`.
- Defined the allowed scraper error surface for this pass as: `message`, optional `status`, `requestUrl`, `requestIdentifier`, and optional `cause`.
- Defined that `BaseScraper.getMatchData()` must keep throwing on non-OK provider responses, including `404`, so caller layers remain responsible for deciding whether that outcome is expected.
- Defined that the scraper error contract must not include business fields or decisions such as `roundSlug`, `tournamentId`, `provider_match_not_found`, skip/suppress decisions, or cron summary semantics.
- Assigned open-match polling `404` classification and readable operational logging to `src/domains/data-provider/services/matches-sync.ts`, because that layer already receives `matchId`, `externalId`, `roundSlug`, and `tournamentId` from `QUERIES_MATCH.listDueOpenMatchesForPolling(...)`.
- Assigned direct single-match update `404` classification and readable operational logging to `src/domains/data-provider/services/match.ts`, because that layer owns the direct-update workflow context and must not inherit cron-specific behavior.
- Assigned cron-level audit summarization to `src/domains/cron/services/executor.ts`, which should receive compact counters and detail lines from service summaries rather than raw nested payload dumps.
- Confirmed that the query layer only provides match context fields for caller logging and must not own classification or log-policy decisions.

## Dependencies

- Agreement that `page.evaluate(...)` remains the transport
- Agreement that no transport swap or broad refactor happens in this pass

## Non-Goals

- No replacement of `page.evaluate(...)` with a different transport or HTTP client.
- No schema redesign for match polling state, including `lastCheckedAt`, suppression flags, or new sync-eligibility fields.
- No suppression or recovery cron/job for provider-missing matches.
- No retry/backoff redesign for provider `404` behavior.
- No tests in this pass; verification remains limited to `yarn compile` and manual review of the resulting log shape.
- No unrelated logger refactors outside the scraper, caller logging, and cron audit output touched by this plan.

## Expected Result

The implementation phases work against an explicit architecture contract:
- `BaseScraper` owns transport execution and low-level failure shaping
- caller services own business meaning, logging decisions, and cron-facing summaries

## Next Steps

After review, start Task 1.1.

# Phase 1

## Goal

Stabilize the shared scraper error contract in `src/domains/data-provider/providers/playwright/base-scraper.ts` without changing the existing `page.evaluate(...)` transport or introducing business-specific classification into the scraper layer.

## Tasks

### Task 1 - Refactor shared scraper error shaping []
#### Task 1.1 - Confirm and preserve the current `page.evaluate(...)` transport semantics []
#### Task 1.2 - Normalize Playwright/browser-side failures into a clean Node-side error shape []
#### Task 1.3 - Attach friendly metadata to the scraper error (`status`, `requestUrl`, `requestIdentifier`) []
#### Task 1.4 - Ensure `getMatchData()` does not own business meaning for expected `404` outcomes []

## Dependencies

- Existing shared use of `BaseScraper` across polling and direct match update flows
- No transport changes
- No test work in this pass

## Expected Result

`BaseScraper.getMatchData()` keeps the same request path but returns a cleaner, reusable error shape that callers can classify without parsing raw Playwright noise.

## Next Steps

After review, start Task 1.1.

# Phase 2

## Goal

Move the business classification and human-readable logging to the callers that actually know the match context, especially `roundSlug` and `tournamentId`.

## Tasks

### Task 2 - Refactor open-match polling logging []
#### Task 2.1 - Ensure the polling query carries the fields needed for readable logging (`matchId`, `externalId`, `roundSlug`, `tournamentId`) []
#### Task 2.2 - Classify scraper `404` failures in `src/domains/data-provider/services/matches-sync.ts` as `provider_match_not_found` []
#### Task 2.3 - Emit a single readable info log for expected provider misses with endpoint and match context []
#### Task 2.4 - Keep unexpected provider failures as `Logger.error(...)` with actionable context []

### Task 3 - Align direct single-match update behavior []
#### Task 3.1 - Apply the same scraper error contract in `src/domains/data-provider/services/match.ts` []
#### Task 3.2 - Decide locally how direct single-match update handles expected provider `404` without coupling it to cron-specific logic []

## Dependencies

- Phase 1 completed
- No schema redesign
- No suppression/recovery cron in this pass

## Expected Result

Expected provider misses stop appearing as raw Playwright stack noise and instead become one clear, contextual log line in the caller that owns the business meaning.

## Next Steps

After review, start Task 2.1.

# Phase 3

## Goal

Make the cron output readable at the operational layer by replacing bulky nested payload dumps with compact summaries and audit-friendly detail lines.

## Tasks

### Task 4 - Refactor cron audit output []
#### Task 4.1 - Replace the raw `matchSyncSummary` dump in `src/domains/cron/services/executor.ts` with a concise count-based audit message []
#### Task 4.2 - Emit compact detail arrays for scanned matches, expected provider-not-found cases, and unexpected failures []
#### Task 4.3 - Verify the resulting terminal output is easy to scan without changing unrelated scheduler behavior []

### Task 5 - Perform bounded verification []
#### Task 5.1 - Run `yarn compile` only []
#### Task 5.2 - Review the final log shape manually against the expected examples []

## Dependencies

- Phase 1 completed
- Phase 2 completed
- No test additions or updates

## Expected Result

The scheduler/cron logs become concise and actionable:
- expected provider misses are logged once with `roundSlug`
- unexpected failures remain errors
- audit output summarizes what happened without `[Object]` noise

## Next Steps

After review, start Task 4.1.
