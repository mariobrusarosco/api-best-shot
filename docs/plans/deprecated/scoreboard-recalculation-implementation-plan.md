# Phase 1

## Goal

Lock the functional contracts that make scoreboard application reliable before changing any persistence or background execution code.

## Decision Log (Locked)

1. Reuse the existing cron job framework and background runner app.
2. Do not create a new queue system.
3. Process finished matches one by one.
4. A match is pending scoreboard application when `status = 'ended'` and `scoreboardAppliedAt IS NULL`.
5. Keep the existing per-guess scoring logic as the single source of truth.
6. Persist tournament totals in `tournament_member.points`.
7. Do not persist league totals; backend returns per-tournament totals and frontend sums them.
8. Create a dedicated scoreboard execution/report flow. Duplication is acceptable for now.
9. Score application is all-or-nothing per match via one transaction, with batched writes inside that transaction.

## Tasks

### Task 1 - Normalize match-finalization contract [ ]
#### Task 1.1 - Define the canonical match status set used by match sync, guess scoring, and read APIs [ ]
#### Task 1.2 - Update provider mapping to emit only canonical statuses [ ]
#### Task 1.3 - Update guess-analysis logic to rely only on canonical statuses [ ]

### Task 2 - Enforce guess write safety [ ]
#### Task 2.1 - Load match before `POST /guess` upsert [ ]
#### Task 2.2 - Reject guess create/update after kickoff time [ ]
#### Task 2.3 - Return a clear API error for locked guesses [ ]

### Task 3 - Lock scoreboard backlog contract [ ]
#### Task 3.1 - Define pending-match query contract (`ended` + `scoreboardAppliedAt IS NULL`) [ ]
#### Task 3.2 - Define tournament and league "under calculation" read contract from the same DB condition [ ]
#### Task 3.3 - Define ordering policy for pending matches (`date ASC`, `updatedAt ASC`) [ ]

## Dependencies

- `match` domain status contract
- `guess` write path and scoring path
- Existing cron job framework

## Expected Result

A stable functional contract for when guesses are editable, when a match is scorable, and how pending scoreboard work is identified.

## Next Steps

Proceed to Phase 2 to add the minimal schema and query changes.


# Phase 2

## Goal

Add the minimum persistence and query support needed for durable scoreboard application and debuggable executions.

## Tasks

### Task 1 - Extend match persistence [ ]
#### Task 1.1 - Add `scoreboardAppliedAt` to `match` schema [ ]
#### Task 1.2 - Add migration for the new column and supporting index [ ]
#### Task 1.3 - Expose the field through match query typings where needed [ ]

### Task 2 - Add scoreboard execution/report persistence [ ]
#### Task 2.1 - Create scoreboard execution schema modeled after data-provider executions [ ]
#### Task 2.2 - Add operation type/status fields for scoreboard runs [ ]
#### Task 2.3 - Add summary/report fields for debugging (`guessesProcessed`, `membersAffected`, `batchesProcessed`, `duration`, `error`) [ ]
#### Task 2.4 - Add query helpers to create, update, and fetch scoreboard executions [ ]

### Task 3 - Add scoreboard-specific query primitives [ ]
#### Task 3.1 - Add query to list pending ended matches with limit and deterministic ordering [ ]
#### Task 3.2 - Add query to mark one match as scoreboard-applied [ ]
#### Task 3.3 - Add query to detect if a tournament still has pending ended matches [ ]
#### Task 3.4 - Add query to detect if any tournament in a league still has pending ended matches [ ]

### Task 4 - Prepare tournament member writes [ ]
#### Task 4.1 - Add helper to upsert missing `tournament_member` rows for a set of members [ ]
#### Task 4.2 - Reuse or adapt the existing bulk points update helper for batched updates [ ]

## Dependencies

- `match` schema
- `tournament_member` schema
- Existing reporting patterns in `data-provider`

## Expected Result

The database can represent pending scoreboard work, completed scoreboard application, and execution/debug metadata without adding unnecessary infrastructure.

## Next Steps

Proceed to Phase 3 to implement the cron target and per-match application flow.


# Phase 3

## Goal

Implement the recurring cron-driven reconciliation flow that applies one finished match at a time.

## Tasks

### Task 1 - Add cron target and runner entrypoint [ ]
#### Task 1.1 - Add `scoreboard.apply_pending_matches` cron target [ ]
#### Task 1.2 - Register target handler in the cron executor [ ]
#### Task 1.3 - Define runtime limit per cron execution (`MAX_MATCHES_PER_RUN`) [ ]

### Task 2 - Implement one-match scoreboard application service [ ]
#### Task 2.1 - Load guesses for one match [ ]
#### Task 2.2 - Score each guess using the existing guess-analysis logic [ ]
#### Task 2.3 - Aggregate earned points by `memberId` [ ]
#### Task 2.4 - Split aggregated member updates into batches [ ]

### Task 3 - Implement transactional write path [ ]
#### Task 3.1 - Open one transaction per match [ ]
#### Task 3.2 - Upsert missing `tournament_member` rows inside the transaction [ ]
#### Task 3.3 - Apply batched point increments inside the same transaction [ ]
#### Task 3.4 - Mark `match.scoreboardAppliedAt` inside the same transaction [ ]
#### Task 3.5 - Roll back everything on failure [ ]

### Task 4 - Implement execution/report lifecycle [ ]
#### Task 4.1 - Create scoreboard execution row when processing starts [ ]
#### Task 4.2 - Store per-run summary and duration on success [ ]
#### Task 4.3 - Store failure summary and error details on failure [ ]
#### Task 4.4 - Optionally generate JSON report file if the implementation cost stays low [ ]

### Task 5 - Define retry behavior [ ]
#### Task 5.1 - Confirm that failed matches remain pending because `scoreboardAppliedAt` stays `NULL` [ ]
#### Task 5.2 - Confirm that committed matches are skipped on subsequent cron runs [ ]
#### Task 5.3 - Confirm no in-memory work is required to recover after runner downtime [ ]

## Dependencies

- Cron target registry
- Match queries
- Guess scoring service
- Tournament member write helpers
- Scoreboard execution/report queries

## Expected Result

A durable recurring job that can stop and resume safely, processes finished matches one by one, and produces an execution report for each applied match.

## Next Steps

Proceed to Phase 4 to expose calculation state and totals to tournament and league consumers.


# Phase 4

## Goal

Expose the new scoreboard state cleanly in read APIs without introducing league-total persistence.

## Tasks

### Task 1 - Tournament read contract [ ]
#### Task 1.1 - Add "under calculation" detection to tournament score reads [ ]
#### Task 1.2 - Return the tournament-level status/message trigger to the frontend [ ]
#### Task 1.3 - Keep existing per-guess match score display behavior intact [ ]

### Task 2 - League read contract [ ]
#### Task 2.1 - Return per-member tournament totals for all tournaments in the league [ ]
#### Task 2.2 - Return per-tournament "under calculation" status [ ]
#### Task 2.3 - Keep league total summation on the frontend only [ ]

### Task 3 - Admin/debug visibility [ ]
#### Task 3.1 - Add API/read path for scoreboard execution history [ ]
#### Task 3.2 - Expose summary fields useful for failed or slow scoreboard applications [ ]

## Dependencies

- Tournament score API
- League details/read APIs
- Scoreboard execution/report persistence

## Expected Result

Tournament and league pages can reliably show both totals and "under calculation" state using the same durable backlog rule.

## Next Steps

Proceed to Phase 5 for verification, performance checks, and rollout safeguards.


# Phase 5

## Goal

Verify correctness, failure recovery, and operational safety before rollout.

## Tasks

### Task 1 - Automated verification [ ]
#### Task 1.1 - Add unit tests for kickoff lock [ ]
#### Task 1.2 - Add unit tests for normalized match-status handling [ ]
#### Task 1.3 - Add unit tests for one-match scoreboard aggregation [ ]
#### Task 1.4 - Add tests for failed transaction retry behavior [ ]

### Task 2 - Performance and batching checks [ ]
#### Task 2.1 - Validate batching strategy with high-member-count fixtures [ ]
#### Task 2.2 - Tune initial batch size (`500` to `1000`) based on query/runtime behavior [ ]
#### Task 2.3 - Validate cron run duration with bounded `MAX_MATCHES_PER_RUN` [ ]

### Task 3 - Rollout safety [ ]
#### Task 3.1 - Add migration/backfill strategy for existing ended matches with no `scoreboardAppliedAt` [ ]
#### Task 3.2 - Define operational runbook for rerunning failed scoreboard matches [ ]
#### Task 3.3 - Define minimal observability checks for stuck pending matches [ ]

## Dependencies

- Test suite
- Cron environment
- Migration strategy

## Expected Result

The implementation is correct, debuggable, and safe to roll out without hidden backlog loss or double-application risk.

## Next Steps

Start implementation with Phase 1, then stop for review before Phase 2.
