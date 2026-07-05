# Persistence

## Purpose

`persistence/` owns durable state access.

In practice, this layer is responsible for reading and writing the data that the V2 workflows need from the database.

## What Belongs Here

- list due matches
- update match state from polling
- write execution-job fields when persistence is needed
- read supporting records required by a use-case

## What Does Not Belong Here

- Playwright logic
- SofaScore endpoint logic
- report upload
- Slack notification
- execution lifecycle orchestration
- business classification such as `provider_match_not_found`

## Mental Model

If the question is:

- "What data do I need?"
- "What row should I update?"
- "How do I persist this result?"

it probably belongs in `persistence/`.

## Relationship With Use Cases

Use-cases call `persistence/`.

`persistence/` should not know why a workflow is running. It only knows how to read and write state safely.

## Example

For `sync-open-matches`, files here may include:

- `list-due-open-matches.ts`
- `update-match-from-polling.ts`
- `touch-match-checked-at.ts`

Each file should do one persistence job well.
