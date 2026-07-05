# Proven Patterns

This document captures the V2 patterns we have already proven in code.

It exists to make the next workflow easier to build without inventing new architecture each time.

Current proven V2 examples:

1. `open-match-sync`
2. `standings-create`
3. `standings-update`

## 1. Stable Ownership Pattern

These ownership boundaries are now proven:

1. `transport/`
   - Playwright runtime/session/page mechanics
   - generic browser navigation and JSON extraction
   - transport-level request metadata and transport errors
2. `providers/`
   - provider endpoint construction
   - provider-specific request execution through shared transport
   - provider request error normalization
3. `use-cases/`
   - workflow semantics
   - provider outcome interpretation
   - coordination across provider access and persistence
   - compact workflow summary shaping
4. `persistence/`
   - database reads/writes only
   - persistence-specific write strategy such as `insert` vs `upsert`
5. `operations/`
   - execution job lifecycle
   - report build/upload
   - Slack notification
   - operation-level observability

Rule:

```text
transport = mechanics
provider = provider meaning
use-case = workflow meaning
persistence = durable state
operations = execution lifecycle + observability
```

## 2. Do Not Split Transport By Workflow

This is the most important rule we proved the hard way.

New workflows do **not** justify new transports by themselves.

Correct rule:

```text
add a new transport path only when the technical access mechanism is genuinely different
```

Examples of truly different mechanisms:

1. Playwright page navigation
2. raw server-side HTTP
3. queue/pub-sub
4. file/S3 transport

Examples that do **not** justify a new transport:

1. `matches` vs `standings`
2. `create` vs `update`
3. one tournament vs many tournaments

For the current V2 subsystem, the proven default is:

```text
one shared Playwright transport path
many workflows on top of it
```

## 3. Browser Lifetime Is Workflow-Driven

We have now proven two valid browser lifetime shapes.

### Pattern A - Single operation owns one browser workspace

Used by:

1. `standings-create`

Shape:

```text
one operation
-> create runtime
-> create session
-> run one tournament workflow
-> close session
-> close runtime
```

Use this when:

1. the workflow is manual/single-tournament
2. there is no real batch to optimize
3. operation-level isolation is the simplest choice

### Pattern B - Batch owns the browser, tournament operations own observability

Used by:

1. `open-match-sync`
2. `standings-update`

Shape:

```text
batch
-> create runtime once
-> create session once
-> for each tournament:
   -> run tournament operation using shared session
-> close session once
-> close runtime once
```

Important rule:

```text
shared browser lifetime does not change tournament-scoped execution/report/Slack ownership
```

So even when the browser is batch-scoped:

1. execution jobs stay tournament-scoped
2. reports stay tournament-scoped
3. Slack notifications stay tournament-scoped

## 4. Internal Batch Core, Single Route Facade

This is now a proven shape for workflows that may run for one or many tournaments.

Used by:

1. `standings-update`

Shape:

```text
internal batch use case accepts tournamentIds: string[]
single admin route delegates with [tournamentId]
future multi-tournament callers reuse the same batch core
```

Why this works:

1. the public admin route stays resource-shaped and simple
2. the core orchestration still supports one or many tournaments
3. browser reuse is enabled without inventing a public batch API too early

Rule:

```text
prefer internal reusable batch orchestration over premature public batch contracts
```

## 5. Reuse Lower Layers, Not Generic Workflow Engines

The proven reuse seam is:

1. shared transport
2. shared provider
3. shared mapping logic
4. shared team lookup
5. workflow-specific write strategy
6. workflow-specific operation runner

Examples:

1. `standings-create` and `standings-update` share:
   - provider access
   - standings mapping
   - team lookup
2. they differ in:
   - persistence write strategy (`insert` vs `upsert`)
   - workflow result vocabulary
   - operation type / report / Slack wording

Rule:

```text
reuse lower layers first
avoid generic runner/framework extraction until repetition is undeniable
```

## 6. Report Is The Forensic Artifact

We now have a stable observability split:

1. execution summary
   - compact
   - bounded preview fields only
   - admin execution-job friendly
2. report
   - full forensic artifact
   - unbounded IDs/details when needed
   - request URLs, response snippets, and workflow details
3. Slack
   - concise operational notification
   - report link when available

Rule:

```text
summary = compact operational view
report = detailed investigation artifact
Slack = notification layer
```

## 7. Exceptions And Expected Outcomes Must Be Separated

We also proved an important error-handling rule.

Low-level layers should preserve technical facts:

1. request URL
2. status code
3. cause message
4. response snippet when safe

Use-cases decide whether a provider fact is:

1. expected
2. downgraded
3. unexpected

Examples:

1. provider `404` may become `provider_match_not_found`
2. missing standings payload may become `provider_response_missing_standings`
3. real transport/runtime issues stay `unexpected_failure`

Rule:

```text
preserve transport/provider facts
classify business meaning in the use-case
```

## 8. Small, Explicit Non-Goals Prevent Drift

The cleanest slices so far all had explicit non-goals.

That is not ceremony. It is a protection against drift.

Examples of useful non-goals:

1. no new transport path
2. no new public batch endpoint
3. no cron integration yet
4. no generic standings engine
5. no automatic coupling between match sync and standings update

Rule:

```text
if a slice is getting fuzzy, write down what it is not allowed to become
```

## 9. What The Next Slice Should Start From

Before building the next V2 workflow, start from these questions:

1. Is the transport mechanism actually new?
   - if not, reuse the shared Playwright transport
2. Is this workflow single-operation or batch-oriented?
   - choose browser lifetime from that answer
3. Can a single-resource route delegate to an internal batch core?
   - prefer that over a premature public batch route
4. Which lower layers are already reusable?
   - provider, mapping, lookup, persistence strategy
5. What are the explicit non-goals for this slice?

If those answers are clear first, the code should stay small and consistent.
