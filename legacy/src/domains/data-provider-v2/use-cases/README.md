# Use Cases

## Purpose

`use-cases/` owns domain workflow semantics.

This layer defines what the system is trying to do, step by step, for a specific business workflow.

## What Belongs Here

- workflow orchestration
- domain decisions
- provider outcome classification
- coordination between provider access and persistence
- workflow result shaping

## What Does Not Belong Here

- raw Playwright/browser management
- SofaScore endpoint construction details
- direct database query details
- execution-job lifecycle
- report upload
- Slack notification

## Mental Model

If the question is:

- "What is this workflow trying to achieve?"
- "How do we classify the outcomes?"
- "What should happen next in business terms?"

it probably belongs in `use-cases/`.

## Relationship With Other Layers

- `use-cases/` calls `providers/` to fetch external data
- `use-cases/` calls `persistence/` to read and write state
- `operations/` calls `use-cases/` and wraps the run in execution/report/Slack lifecycle

## Example

For `sync-open-matches`, files here may include:

- `run-open-match-sync-batch.ts`
- `run-tournament-open-match-sync.ts`
- `classify-match-sync-outcome.ts`

The use-case should know what counts as:

- `updated`
- `provider_status_not_ended`
- `provider_response_missing_event`
- `provider_match_not_found`
- `unexpected_failure`

That meaning belongs here, not in the transport, provider, or operations layers.
