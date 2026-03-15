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

## Goal

Make each workflow easier to reason about, easier to debug, and easier to monitor without re-importing V1 architectural debt.
