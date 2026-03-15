# Transport

## Purpose

`transport/` owns technical runtime mechanics.

For this subsystem, that mainly means Playwright lifecycle and safe browser-context execution primitives.

## What Belongs Here

- browser startup and shutdown
- page/context/session management
- generic browser-context request execution
- generic page navigation and extraction helpers when truly reusable

## What Does Not Belong Here

- SofaScore endpoint construction
- match or tournament semantics
- business classification of outcomes
- execution jobs
- reports
- Slack notifications

## Mental Model

If the question is:

- "How do we execute this in Playwright?"
- "How do we manage sessions safely?"
- "How do we run this request in browser context?"

it probably belongs in `transport/`.

## Important Constraint

For SofaScore, Playwright/browser-context access is not optional.

Direct non-browser `fetch()` is a known `403` path for this integration.

## Relationship With Providers

`providers/` depends on `transport/`.

`transport/` must not know what provider or workflow is using it.
