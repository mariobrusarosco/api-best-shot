# Providers

## Purpose

`providers/` owns external-provider-specific logic.

For V2, this is where SofaScore-specific endpoint construction, request semantics, and response normalization should live.

## What Belongs Here

- provider endpoint builders
- provider-specific request wrappers built on top of `transport/`
- provider response normalization
- provider error contracts

## What Does Not Belong Here

- Playwright runtime lifecycle
- direct database persistence
- execution jobs
- report upload
- Slack notification
- cron-level summaries
- business decisions that depend on a specific use-case

## Mental Model

If the question is:

- "How does SofaScore expose this resource?"
- "What endpoint do we call?"
- "How do we normalize this provider response?"
- "What structured provider error should we throw?"

it probably belongs in `providers/`.

## Relationship With Other Layers

- `providers/` uses `transport/`
- `use-cases/` use `providers/`

`providers/` should know the external provider well, but should not know the business meaning of a workflow outcome.

## Example

A provider-level match fetch may know:

- event URL shape
- request identifier
- response normalization
- raw provider `404`

It should not decide:

- whether that `404` is expected for `sync-open-matches`
- whether the workflow should fail
- how the report should be written
