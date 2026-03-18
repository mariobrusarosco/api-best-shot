# Data Provider V1 -> V2 Coverage Matrix

## Goal

Prove that the current V2 architecture can cover all required V1 outcomes without inventing new architectural layers later.

This document is a gate.

We do **not** move into V2 implementation unless this matrix shows that the planned V2 layers can absorb every required V1 outcome we care about.

## Rule

V2 may change:

1. architecture
2. file structure
3. implementation strategy

V2 may **not** drop V1 outcomes.

If V1 currently achieves something important, V2 must still achieve it.

## V2 Layers Being Evaluated

We are validating V1 coverage against these V2 layers:

1. `transport/`
2. `providers/`
3. `use-cases/`
4. `persistence/`
5. `operations/`

## Evaluation Criteria

A V1 capability is considered covered only if:

1. we can place it clearly in one of the V2 layers
2. the ownership feels stable for all related workflows
3. we do not need to invent a new cross-cutting layer later to support it

## Global V1 Outcomes That V2 Must Preserve

Across the subsystem, V1 currently provides these important outcomes:

1. fetch provider data from SofaScore using Playwright/browser context
2. persist domain data to the database
3. create tournament-scoped execution jobs
4. upload detailed JSON reports
5. send Slack notifications
6. expose execution-job history in admin using the current execution table contract
7. upload provider assets such as tournament logos and team badges to S3/CloudFront
8. support multiple workflows:
   - tournament create/update
   - tournament current-round sync
   - rounds create/update
   - standings create/update
   - teams create/update
   - matches create/update
   - open-match polling

## Capability Matrix

### 1. Playwright-based SofaScore access

V1 evidence:

- generic navigation/content extraction in [base-scraper.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/providers/playwright/base-scraper.ts#L131)
- match-event request in [base-scraper.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/providers/playwright/base-scraper.ts#L223)
- standings fetch in [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts#L229)
- rounds fetch in [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts#L344)
- tournament current-round fetch in [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts#L302)

V2 owner:

1. `transport/`
2. `providers/`

Assessment:

- Covered.
- This is a strong fit for the planned V2 split.

Notes:

- The explicit Playwright/403 constraint is necessary and already captured in the ADR.

### 2. Match event endpoint access

V1 evidence:

- `getMatchData()` in [base-scraper.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/providers/playwright/base-scraper.ts#L223)
- use in [matches-sync.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/matches-sync.ts#L12)
- use in [match.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/match.ts#L741)

V2 owner:

1. `providers/sofascore/`
2. `use-cases/`

Assessment:

- Covered.
- This is one of the clearest improvements in V2.

### 3. Tournament rounds fetch and normalization

V1 evidence:

- fetch rounds in [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts#L344)
- current-round sync rounds fetch in [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts#L302)

V2 owner:

1. `providers/sofascore/`
2. `use-cases/`
3. `persistence/`

Assessment:

- Covered.
- Same provider/transport contract used for matches can scale to rounds without adding a new layer.

### 4. Standings fetch and normalization

V1 evidence:

- fetch standings in [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts#L229)
- team extraction from standings in [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts#L273)

V2 owner:

1. `providers/sofascore/`
2. `use-cases/`
3. `persistence/`

Assessment:

- Covered.
- The same V2 provider layer can own standings endpoint logic without any new architectural concept.

### 5. Team badge fetch and upload

V1 evidence:

- team logo URL generation and upload in [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts#L222)
- asset upload path in [base-scraper.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/providers/playwright/base-scraper.ts#L260)
- S3 storage in [file-storage.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/file-storage.ts#L1)

V2 owner:

1. `providers/sofascore/` for asset URL construction
2. `transport/` only if browser access is required for the fetch
3. `operations/` or a dedicated storage adapter inside `operations/` for upload/report artifact boundary

Assessment:

- Covered, but this is one of the most important places to be explicit.

Notes:

- V2 already needs a report uploader in `operations/`.
- The same subsystem can own uploaded operation artifacts and uploaded provider assets without creating a new top-level layer.
- We should keep “asset storage” as an implementation detail under the existing V2 layers, not create a sixth layer for it.

### 6. Tournament logo fetch and upload

V1 evidence:

- tournament logo URL + upload in [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts#L250)

V2 owner:

1. `providers/sofascore/` for URL logic
2. `operations/` or shared storage adapter for upload
3. `use-cases/` for orchestration

Assessment:

- Covered.
- Same reasoning as team badges.

### 7. Execution job creation and status lifecycle

V1 evidence:

- execution lifecycle in [execution.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/execution.ts#L1)
- schema in [schema/index.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/schema/index.ts#L1)
- query helpers in [queries/index.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/queries/index.ts#L1)
- admin read path in [tournament.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/admin/services/tournament.ts#L107)

V2 owner:

1. `operations/`
2. `persistence/` for low-level DB writes if we decide to split store vs orchestrator

Assessment:

- Covered.
- Strong fit for the `operations/` layer.

Notes:

- Current admin expectations around summary shape must be preserved.

### 8. Report generation and upload

V1 evidence:

- report builder/uploader in [report.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/report.ts#L1)

V2 owner:

1. `operations/`

Assessment:

- Covered.
- This belongs cleanly in `operations/`.

### 9. Slack notifications

V1 evidence:

- success/failure notify lifecycle in [execution.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/execution.ts#L127)
- shared Slack client in [core/slack/index.ts](/Users/mariobrusarosco/coding/api-best-shot/src/core/slack/index.ts#L1)

V2 owner:

1. `operations/`

Assessment:

- Covered.
- This is exactly what `operations/` is for.

### 10. Open-match polling and end-state update

V1 evidence:

- workflow in [matches-sync.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/matches-sync.ts#L67)
- query support in [match/queries/index.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/match/queries/index.ts#L152)

V2 owner:

1. `use-cases/`
2. `providers/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.
- This is the first V2 workflow because it exercises the whole architecture.

### 11. Matches create/update from rounds

V1 evidence:

- round-based match fetching and mapping in [match.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/match.ts#L202)
- update single match in [match.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/match.ts#L711)

V2 owner:

1. `providers/`
2. `use-cases/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.
- No additional layer required beyond the current V2 design.

### 12. Team creation/update workflows

V1 evidence:

- create/update in [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts#L30)
- standings and knockout-based team source flows in [teams.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/teams.ts#L259)

V2 owner:

1. `providers/`
2. `use-cases/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.
- This is the strongest proof that V2 must support mixed-source orchestration inside `use-cases/`, but it still does not require a new architectural layer.

### 13. Standings create/update workflows

V1 evidence:

- create/update in [standings.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/standings.ts#L37)

V2 owner:

1. `providers/`
2. `use-cases/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.

### 14. Rounds create/update and knockout discovery workflows

V1 evidence:

- create/update in [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts#L154)
- knockout discovery in [rounds.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/rounds.ts#L50)

V2 owner:

1. `providers/`
2. `use-cases/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.

### 15. Tournament create/update/current-round workflows

V1 evidence:

- tournament create/update/current-round in [tournaments.ts](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider/services/tournaments.ts#L51)

V2 owner:

1. `providers/`
2. `use-cases/`
3. `persistence/`
4. `operations/`

Assessment:

- Covered.

## Architectural Gaps Check

After mapping V1 outcomes to V2 layers, the remaining concerns are:

1. asset upload ownership
2. execution summary compatibility with admin UI

These are not new architectural layers.

They are design details that fit inside the existing planned layers:

1. asset upload can be handled by provider/use-case orchestration plus storage adapters under `operations/` or a V2-local shared helper
2. admin summary compatibility is an `operations/` contract issue

## Verdict

The current V2 architecture is sufficient to cover all identified V1 outcomes **without inventing new top-level architectural layers later**.

That means:

1. `transport/`
2. `providers/`
3. `use-cases/`
4. `persistence/`
5. `operations/`

is enough.

We do **not** currently need:

1. `assets/` as a new top-level layer
2. `notifications/` as a new top-level layer
3. `reporting/` as a new top-level layer
4. `BaseScraperV2`

## Decision

The current V2 architecture passes the coverage gate.

We may proceed to implementation planning and implementation **as long as**:

1. we keep asset upload as an internal concern inside existing layers
2. we preserve execution-job summary compatibility for admin
3. we do not let provider/business/operation boundaries blur again

## Next Step

Proceed with the V2 implementation plan for the first workflow:

`matches.sync_ended`

while keeping this matrix as the gate for future V2 workflow additions.
