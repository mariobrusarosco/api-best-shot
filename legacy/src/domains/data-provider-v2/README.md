# Data Provider V2

## Purpose

`data-provider-v2/` is a from-scratch rewrite of the data-provider subsystem.

It exists to replace the V1 subsystem with a clearer internal architecture:

- `transport/`
- `providers/`
- `use-cases/`
- `persistence/`
- `operations/`

## Hard Rules

1. Do not import code from `src/domains/data-provider/**`
2. Keep Playwright/browser-context access for SofaScore requests
3. Keep execution jobs, reports, and Slack notifications as first-class operational requirements
4. Keep ownership boundaries explicit across layers
5. Do not create a new transport path just because a workflow is new

## Proven Reference

Before starting a new V2 workflow, read:

- [PROVEN_PATTERNS.md](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/PROVEN_PATTERNS.md)
- [V1_EQUIVALENTS.md](/Users/mariobrusarosco/coding/api-best-shot/src/domains/data-provider-v2/V1_EQUIVALENTS.md)

## Layer Summary

- `transport/` = browser/runtime mechanics
- `providers/` = SofaScore-specific access and provider contracts
- `use-cases/` = domain workflow semantics
- `persistence/` = durable state access
- `operations/` = execution lifecycle and observability

## Default Direction

When in doubt:

1. keep low-level layers generic
2. keep provider logic in `providers/`
3. keep domain meaning in `use-cases/`
4. keep execution/report/Slack logic in `operations/`

## Default Workflow Pattern

For tournament-scoped V2 workflows, the default pattern is:

1. batch discovers work
2. operation runner owns the operation envelope
3. use-case owns the domain workflow
4. provider owns provider meaning
5. transport owns Playwright/browser mechanics
6. persistence owns durable reads/writes

This is the stable V2 approach.

- keep the ownership pattern consistent across workflows
- do not force one generic runner too early
- prefer workflow-specific implementations until repetition proves a shared abstraction is justified

## Default Browser Lifetime Rule

When a V2 workflow needs Playwright, the default rule is:

1. one operation owns one browser workspace
2. that workspace may stay simple: one browser, one context, one page reused through the operation
3. cross-operation browser reuse is an optimization, not a default
4. extra contexts or stronger isolation should be added only when a workflow proves it needs them

This keeps the V2 architecture modern without forcing more browser isolation than the workflow actually requires.

Current proven variants:

1. single-operation browser workspace
   - example: `standings-create`
2. batch-scoped browser workspace with tournament-scoped execution/report/Slack
   - examples: `open-match-sync`, `standings-update`

## Goal

Make each workflow easier to reason about, easier to debug, and easier to monitor without re-importing V1 architectural debt.

## Naming

- `runtime` = a live Playwright browser process
- `session` = one browser workspace used by an operation, typically one context plus one page

Plain English:

- runtime = the browser we launched
- session = the browser workspace we use for one run
