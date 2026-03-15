# Operations

## Purpose

`operations/` owns execution lifecycle and observability.

This layer wraps a use-case in the operational flow required by the product:

1. create execution job
2. run the use-case
3. create and upload report
4. complete or fail the execution job
5. send Slack notification

## What Belongs Here

- operation runners
- execution-job lifecycle helpers
- report upload helpers
- Slack notification helpers
- operation-level summary shaping

## What Does Not Belong Here

- Playwright request logic
- SofaScore endpoint logic
- raw database persistence for match state
- provider response normalization
- domain classification rules that belong to the use-case

## Mental Model

If the question is:

- "How is this run tracked?"
- "How do we report what happened?"
- "When do we mark success or failure?"

it probably belongs in `operations/`.

## Relationship With Use Cases

An operation owns the execution of a use-case.

Default rule:

- one operation owns one primary use-case

That keeps execution jobs, reports, and Slack notifications easy to understand.

## Example

For `sync-open-matches`, files here may include:

- `tournament-operation-runner.ts`
- `execution-job-store.ts`
- `report-uploader.ts`
- `slack-notifier.ts`

The use-case produces the workflow result.  
The operation turns that result into an observable run.
