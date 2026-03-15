# ADR-005: Data Provider V2 Architecture

## Status

Proposed

## Context

The current `src/domains/data-provider` subsystem has reached the point where local fixes are no longer enough to recover architectural clarity.

The main problems are structural:

1. Shared infrastructure owns provider-specific logic.
   Example: `BaseScraper.getMatchData()` hardcodes the SofaScore event endpoint and match request behavior.
2. Service classes mix too many responsibilities:
   - transport
   - provider access
   - transformation
   - persistence
   - execution tracking
   - report generation
   - notification flow
3. Error handling lacks a stable contract, which forces callers to classify conditions by parsing strings.
4. Operational logging and cron summaries are downstream of bulky internal payloads instead of explicit summary contracts.
5. The subsystem has no single, consistent home for provider-specific SofaScore access logic.

These problems are large enough that continuing to patch V1 will likely preserve confusion rather than remove it.

## Architectural Constraints

These constraints are non-negotiable for V2:

1. **Playwright is mandatory for SofaScore access**
   - Direct non-browser `fetch()` against SofaScore endpoints is a known `403` path in this integration.
   - V2 must preserve browser-context access through Playwright.
2. **Tournament-scoped operations must create tournament-scoped execution jobs**
   - If an operation acts on tournament `X`, it must create an execution job for tournament `X`.
3. **Every operation must create and upload a report**
   - The report is the detailed operational artifact for debugging and auditability.
4. **Every operation must send a Slack notification**
   - Success/failure notifications are part of the operation lifecycle.
5. **V2 must be written from scratch**
   - V2 must not import code from `src/domains/data-provider/**`.
   - No wrappers around V1.
   - No delegation from V2 to V1.
   - No reuse of `BaseScraper` or V1 data-provider services.

## Decision

We will create a new subsystem at:

`src/domains/data-provider-v2/`

V2 will be a hard-separated rewrite with its own internal architecture.

V2 will not reuse V1 data-provider code.  
It may still use repository-wide shared infrastructure and existing domain contracts where appropriate, such as:

1. database access
2. logger
3. tournament/match/team/round schemas and queries
4. scheduler / admin integration points

The intent is:

1. rewrite the data-provider internals from scratch
2. preserve the repository’s real system-of-record boundaries
3. avoid carrying V1 architectural debt into V2

## V2 Source Structure

Target structure:

```text
src/domains/data-provider-v2/
├── transport/
│   └── playwright/
├── providers/
│   └── sofascore/
├── use-cases/
├── persistence/
├── operations/
├── contracts/
├── utils/
└── typing.ts
```

## Layer Responsibilities

### 1. Transport Layer

Example location:

`src/domains/data-provider-v2/transport/playwright/`

Owns:

1. Playwright browser lifecycle
2. page/context/session management
3. generic browser-context execution primitives
4. navigation and page-content utilities where truly generic

Does not own:

1. SofaScore endpoint construction
2. match/round/standings semantics
3. execution jobs
4. reports
5. Slack notifications
6. business classification of `404`

### 2. Provider Layer

Example location:

`src/domains/data-provider-v2/providers/sofascore/`

Owns:

1. SofaScore endpoint construction
2. provider-specific request execution through the transport layer
3. provider response normalization
4. provider request error contract

Does not own:

1. tournament execution jobs
2. report upload
3. Slack notification
4. cron summaries
5. business decisions such as whether a provider `404` is expected for a specific workflow

### 3. Use-Case Layer

Example location:

`src/domains/data-provider-v2/use-cases/`

Owns:

1. workflow orchestration
2. business interpretation of provider outcomes
3. coordination across provider access and persistence
4. operation-level summary shaping

Example use cases:

1. `sync-open-matches`
2. `sync-single-match`
3. `sync-current-round`
4. `sync-standings`
5. `sync-teams`
6. `sync-rounds`

### 4. Persistence Layer

Example location:

`src/domains/data-provider-v2/persistence/`

Owns:

1. writing normalized provider results to the database
2. adapting query-layer contracts for V2 use cases
3. persistence-specific result summaries

Does not own:

1. provider access
2. Playwright transport
3. Slack/report/execution lifecycle

### 5. Operations Layer

Example location:

`src/domains/data-provider-v2/operations/`

Owns the required operation envelope:

1. create execution job
2. run use case
3. build summary
4. create and upload report
5. complete/fail execution job
6. send Slack notification

This layer is the single place that guarantees the operational contract.

## Required Operation Envelope

Every tournament-scoped data-provider V2 operation must follow this lifecycle:

```text
create execution job
-> execute provider use case
-> collect operation summary and details
-> create and upload report
-> complete or fail execution job
-> send Slack notification
```

This envelope is part of the architecture, not an implementation detail.

## Error Contract Rules

V2 must define stable error contracts.

At minimum:

1. transport errors
2. provider request errors
3. persistence errors
4. use-case/domain errors

Provider request errors should carry structured metadata such as:

1. message
2. provider
3. request URL
4. request identifier
5. status, when known
6. cause, when available

Caller layers must not depend on string parsing such as:

`error.message.includes('Received status 404')`

That pattern is explicitly disallowed in V2.

## Dependency Rules

Allowed:

1. `use-cases -> providers`
2. `use-cases -> persistence`
3. `use-cases -> operations contracts`
4. `providers -> transport`
5. `operations -> use-cases`
6. `operations -> shared repo infrastructure`

Disallowed:

1. `transport -> providers`
2. `transport -> use-cases`
3. `providers -> operations`
4. `providers -> persistence`
5. `data-provider-v2 -> data-provider` (V2 must not import V1)

## Why Not Patch V1 Further

This ADR intentionally chooses V2 instead of continuing with V1 cleanup because:

1. V1 has no stable ownership boundary for provider access logic.
2. V1 mixes orchestration and technical concerns in the same classes.
3. V1 fixes tend to become local improvements that preserve subsystem inconsistency.
4. The open-match logging problem is a symptom of a deeper architectural problem, not an isolated bug.

## Why Not `BaseScraperV2`

We explicitly avoid centering V2 around a new `BaseScraperV2` abstraction.

Reason:

1. the main problem is not “the base class is old”
2. the main problem is that provider logic and operation logic are not separated clearly
3. a new base class would risk recreating the same coupling under a new name

V2 should be shaped by layers and contracts, not by a renamed base abstraction.

## Consequences

### Positive

1. Clear separation between transport, provider access, orchestration, persistence, and operations.
2. Stable place for SofaScore-specific logic.
3. Stable error contracts.
4. Cleaner operational output and easier debugging.
5. No V1 architectural debt imported into V2 internals.

### Negative

1. Higher upfront design and implementation cost.
2. Temporary coexistence of V1 and V2 in the repository.
3. Need for deliberate cutover planning for each workflow.

## Out of Scope

This ADR does not define:

1. exact file-by-file implementation sequence
2. cutover timing for each existing V1 workflow
3. scheduler changes outside what is needed to call V2 use cases
4. UI/admin redesign for execution job visualization
5. schema redesign for match polling state

## Superseded Guidance

Parts of the current V1-oriented guidance in:

`docs/guides/data-provider-best-practices.md`

should be treated as V1 guidance only once V2 work starts.

In particular, V2 will not assume:

1. service classes own scraper instances directly as the primary architectural pattern
2. V1 report/execution flow shape is the authoritative long-term pattern

## Next Step

Before writing V2 code, produce a second design document that defines:

1. the first V2 workflow to implement
2. the concrete V2 module map for that workflow
3. the V2 error contract types
4. the V2 operation envelope interfaces
