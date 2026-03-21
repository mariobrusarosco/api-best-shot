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

## Goal

Make each workflow easier to reason about, easier to debug, and easier to monitor without re-importing V1 architectural debt.
