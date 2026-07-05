# Phase 1

## Goal

Define the recurring knockout-discovery architecture and lock the decision to create one cron job per eligible tournament at tournament creation time.

## Decision Log (Locked)

1. Tournament-scoped scheduling at creation time is approved.
2. Eligible modes are `regular-season-and-knockout` and `knockout-only`.
3. Recurrence target is 36h (1.5 days), not 6h/12h.
4. Recurring definitions cap must be removed (no hard cap).
5. To preserve exact 36h cadence, default approach is chained scheduling (`nextRun = now + 36h`) rather than fixed cron approximation.

## Tasks

### Task 1 - Confirm scope and constraints [x]
#### Task 1.1 - Confirm eligible tournament modes for automatic job creation (`regular-season-and-knockout`, `knockout-only`) [x]
#### Task 1.2 - Confirm recurring cadence policy target (`36h`) and timezone policy [x]
#### Task 1.3 - Confirm no global recurring cap for cron definitions [x]

### Task 2 - Compare implementation approaches for cadence [x]
#### Task 2.1 - Approach A: Cron expression approximation (daily/every 2 days) [x]
#### Task 2.2 - Approach B: Chained scheduling with `now + 36h` after terminal run (Selected) [x]
#### Task 2.3 - Approach C: Two recurring windows with deterministic skip logic [x]

### Task 3 - Select final approach and operational tradeoff [x]
#### Task 3.1 - Pick default approach and fallback approach [x]
#### Task 3.2 - Define expected run volume and scheduler load guardrails [x]

## Dependencies

- Existing Cron Definitions and Runs domain
- Existing per-target cron executor registry
- Existing rounds and match data-provider services

## Expected Result

A finalized architecture decision for per-tournament knockout discovery jobs, including exact cadence behavior and lifecycle expectations.

## Next Steps

Proceed to Phase 2 to define exact data contracts and diff logic.


# Phase 2

## Goal

Define deterministic discovery logic for new rounds and deterministic candidate round selection for targeted match updates.

## Draft Round Identity Contract (v0.1)

Purpose:
1. Ensure stable detection of new rounds without relying on ambiguous provider numeric round IDs.
2. Prevent unnecessary full-round or full-tournament match refreshes.

Identity rules:
1. Round identity key is `(tournamentId, normalizedSlug)`.
2. `normalizedSlug` must be produced using the same normalization pipeline used for round persistence:
- Knockout round with name/slug: `slug.toLowerCase()`
- Special prefixed round: `${prefix}-${slug}` in lowercase
- Regular numeric round: `${round}` string
3. `providerId` (`round` numeric field) is metadata only, not a diff key.

Diff contract:
1. Fetch provider `/rounds`, normalize all provider rounds to the internal shape.
2. Build DB key set from existing tournament rounds by `(tournamentId, slug)`.
3. `newRounds = normalizedProviderRounds where key not in dbKeySet`.
4. Upsert `newRounds` before candidate-round match sync starts.
5. Existing rounds may still be selected as candidates (`current + previous`) for hydration checks, but they are not considered \"new\".

Conflict/update behavior for existing rounds:
1. Existing rows are not treated as discovery deltas.
2. Existing rows can be refreshed only when selected as runtime candidates (`current + previous`) and only through round-targeted match sync.
3. Structural updates to existing round metadata are non-goal for this cron and remain under explicit rounds sync workflows.

## Draft Candidate Round Contract (v0.1)

Purpose:
1. Sync only the minimum set of rounds needed to catch newly created knockout rounds and late-hydrated events.

Input sets:
1. `providerRoundsNormalized` from `/rounds` using existing `RoundsDataProviderService` normalization.
2. `providerKnockoutRounds = providerRoundsNormalized.filter(type === 'knockout')`.
3. `dbRoundsBySlug` scoped by tournament.

Selection rule:
1. Candidate Set A (`newly discovered rounds`):
- All normalized knockout rounds whose `(tournamentId, slug)` key does not exist in DB.
2. Candidate Set B (`provider current round`):
- Resolve provider `currentRound.slug` against normalized knockout rounds.
- If resolved and knockout, include it.
- If not resolved as knockout, fallback to highest-order available knockout round (if any).
3. Candidate Set C (`previous round`):
- Use Set B as anchor when available.
- Select immediate previous knockout round in sorted order (not strict `order - 1`, because provider order can have gaps).

Execution order:
1. Upsert Set A first (discover new rounds).
2. Build final candidate list as `A + B + C`.
3. De-duplicate by `(tournamentId, slug)`.
4. Keep deterministic priority order: all Set A first, then Set B, then Set C.

No-knockout behavior:
1. If provider knockout list is empty, do not run round-targeted match updates (no-op run with summary reason `no_knockout_rounds_available`).

## Tasks

### Task 1 - Define round identity and diff rules [x]
#### Task 1.1 - Use normalized round slug as identity key scoped by tournament [x]
#### Task 1.2 - Define provider payload normalization invariants (slug, order, type, providerUrl) [x]
#### Task 1.3 - Define conflict/update behavior for already-known rounds [x]

### Task 2 - Define candidate rounds strategy [x]
#### Task 2.1 - Candidate Set A: newly discovered rounds [x]
#### Task 2.2 - Candidate Set B: provider current round [x]
#### Task 2.3 - Candidate Set C: previous round by order (current - 1) [x]
#### Task 2.4 - De-duplicate candidate rounds before match sync [x]

### Task 3 - Define targeted match sync behavior [ ]
#### Task 3.1 - For each candidate round, fetch matches only from that round provider URL [ ]
#### Task 3.2 - Upsert matches for candidate rounds only [ ]
#### Task 3.3 - Define no-op behavior when round has zero events (not-yet-hydrated) [ ]

## Dependencies

- `RoundsDataProviderService` normalization behavior
- `MatchesDataProviderService.updateRound` round-targeted update path
- Tournament-round query support (`getRound`, `getAllRounds`)

## Expected Result

A precise algorithm that avoids full-tournament match updates while safely handling late-hydrated rounds.

## Next Steps

Proceed to Phase 3 to define job lifecycle management and terminal-state handling.


# Phase 3

## Goal

Define lifecycle for per-tournament recurring jobs: creation, execution, pause, and cleanup.

## Tasks

### Task 1 - Define job creation policy [ ]
#### Task 1.1 - Create definition during tournament creation for eligible modes [ ]
#### Task 1.2 - Define deterministic `jobKey` convention including tournament ID [ ]
#### Task 1.3 - Define payload schema for per-tournament execution context [ ]

### Task 2 - Define runtime idempotency and safety [ ]
#### Task 2.1 - Confirm no overlapping runs for same definition version [ ]
#### Task 2.2 - Define safe retry behavior via next recurrence only (no immediate auto-retry) [ ]
#### Task 2.3 - Define duplicate creation protection for tournament-level job provisioning [ ]

### Task 3 - Define pause and retirement strategy [ ]
#### Task 3.1 - Pause job when tournament is completed/cancelled [ ]
#### Task 3.2 - Define behavior when tournament mode is changed to ineligible [ ]
#### Task 3.3 - Define behavior for soft-deleted tournaments [ ]

## Dependencies

- Cron definitions API/service
- Tournament status lifecycle fields
- Admin cron pause/resume mechanisms

## Expected Result

A complete job lifecycle specification that prevents orphaned or redundant recurring jobs.

## Next Steps

Proceed to Phase 4 to define tournament-completion detection rules from provider payload evidence.


# Phase 4

## Goal

Define evidence-based rules to determine tournament completion from SofaScore payloads and trigger auto-pause reliably.

## Draft Completion Contract (v0.1)

Based on validated payload evidence:
- `/info` and `/standings/total` are not authoritative completion signals.
- `/rounds` + terminal-round `/events` are the primary completion source.

Proposed deterministic rule:
1. Fetch season `/rounds` and normalize rounds with existing mapping logic.
2. Resolve terminal knockout round candidate:
- Prefer round with `slug` containing `final`.
- Fallback to highest-order knockout round.
3. Fetch terminal round events from normalized `providerUrl`.
4. `isTournamentCompleted = true` only when all are true:
- Terminal round has at least one event.
- Every terminal event has `status.type = 'finished'`.
- No terminal event has `startTimestamp` in the future.
5. If `isTournamentCompleted = true`, pause the tournament-scoped recurring definition.

Reliability safeguard:
1. Optional two-run confirmation before pause:
- First run marks `completionCandidate=true`.
- Second consecutive run with same condition pauses definition.

Known caveat already observed in provider payload:
1. `round` numeric IDs can repeat across contexts (including prefix/no-prefix variants),
so diff identity must stay slug-based (normalized slug, scoped by tournament).

## Tasks

### Task 1 - Gather provider payload evidence [ ]
#### Task 1.1 - Active tournament `/rounds` payload sample [ ]
#### Task 1.2 - Completed tournament `/rounds` payload sample [x]
#### Task 1.3 - Tournament summary payload sample containing season/tournament status fields [x]
#### Task 1.4 - Final-stage match payload samples (semifinal/final) including `status.type`, timestamps [x]

### Task 2 - Define completion-detection approaches with tradeoffs [ ]
#### Task 2.1 - Approach A: Tournament-level status field authoritative [ ]
#### Task 2.2 - Approach B: Last knockout round fully ended + no future scheduled events [ ]
#### Task 2.3 - Approach C: Hybrid rule (A preferred, fallback to B) [ ]

### Task 3 - Define final completion contract [ ]
#### Task 3.1 - Deterministic `isTournamentCompleted` rule with explicit edge-case handling [ ]
#### Task 3.2 - Define confidence/fallback behavior when provider payload is incomplete [ ]
#### Task 3.3 - Define pause trigger conditions and observability fields in run summary [ ]

## Dependencies

- SofaScore payload samples (active season still needed)
- Existing tournament status model and cron pause operation

## Expected Result

A deterministic, auditable completion rule that can safely pause per-tournament recurring jobs.

## Next Steps

Proceed to Phase 5 for implementation sequencing and validation plan.


# Phase 5

## Goal

Prepare implementation and validation sequence with minimal risk and clear rollout controls.

## Tasks

### Task 1 - Implementation sequence plan [ ]
#### Task 1.1 - Add new cron target handler for per-tournament knockout discovery [ ]
#### Task 1.2 - Wire tournament-creation hook for automatic definition provisioning [ ]
#### Task 1.3 - Remove recurring-definition cap and validate scheduler pagination behavior [ ]

### Task 2 - Validation plan [ ]
#### Task 2.1 - Unit tests for round diff and candidate round selection [ ]
#### Task 2.2 - Integration tests for per-tournament execution path [ ]
#### Task 2.3 - Operational verification checklist (job creation, runs, pause-on-completion) [ ]

### Task 3 - Rollout and rollback [ ]
#### Task 3.1 - Staging rollout with selected tournaments [ ]
#### Task 3.2 - Monitoring checklist and alert thresholds [ ]
#### Task 3.3 - Rollback procedure (pause all new tournament-scoped jobs) [ ]

## Dependencies

- Finalized completion rule from Phase 4
- Test fixtures for active/completed tournament payloads

## Expected Result

A safe, incremental implementation plan with measurable validation criteria and rollback readiness.

## Next Steps

After your review, I will refine this plan with remaining active-season payload evidence and freeze the final execution checklist before any implementation.
