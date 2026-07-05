# Codex Collaboration Guide

## Goal

Use this workflow when a task touches shared infrastructure, error handling, cron behavior, scraper logic, auth, or any code path where one wrong assumption can create a lot of noise.

## Core Idea

Do not start with implementation.

Start with a short zero-edit pre-phase that locks:
- architecture boundaries
- ownership of behavior
- error contract
- non-goals

Then implement one task at a time, stopping for review after each task.

## Why This Works

- It reduces bad assumptions before code is touched.
- It protects shared infrastructure from accidental business-logic leakage.
- It forces ownership to be explicit before error handling is changed.
- It keeps scope tight and makes drift visible early.
- It makes reviews smaller and easier to trust.
- It works well when the repo has historical constraints that are not obvious from a single file.

## Recommended Workflow

1. Start in zero-edit mode.
2. Read all relevant files fully.
3. Create a plan in `docs/plans`.
4. Add `Phase 0 - Architecture Boundary` before implementation phases.
5. In Phase 0, define:
   - what the shared layer owns
   - what the caller/business layer owns
   - the allowed error contract
   - explicit non-goals
6. Stop for review after each Phase 0 task.
7. Only after Phase 0 is approved, start implementation.
8. Implement one task or subtask at a time.
9. After each task, stop and ask for review before continuing.

## Good Default Rules

- Do not change transport or mechanism without explicit approval.
- Do not broaden scope just because a related improvement looks useful.
- Do not put business meaning into shared infrastructure.
- Keep low-level layers focused on transport, normalization, and metadata propagation.
- Keep business classification, readable logs, and summaries in the caller that has the real context.
- Add a `Non-Goals` section to the plan so the implementation stays bounded.

## When To Use It

Use this workflow for:
- shared scraper changes
- logger/error-handling refactors
- cron/scheduler work
- auth flows
- migrations or schema-sensitive work
- infrastructure code reused by multiple services

It is usually overkill for:
- isolated single-file bug fixes
- copy changes
- trivial UI tweaks

## Copy-Paste Kickoff Prompt

```md
Use zero-edit mode first.

Before implementing:
1. Read all relevant files fully.
2. Create a plan in `docs/plans/<task-name>.md`.
3. Start with `Phase 0 - Architecture Boundary`.
4. In Phase 0, define:
   - shared-layer responsibilities
   - caller/business-layer responsibilities
   - the error contract
   - explicit non-goals
5. Stop after each task and ask me to review before continuing.

Implementation rules:
- Do one task/subtask at a time.
- Do not widen scope.
- Do not change transport/mechanism without explicit approval.
- If the task touches shared infrastructure, keep business rules out of it unless I approve that design.
```

## Practical Rationale

This workflow is useful because Codex can often produce a locally reasonable patch that is still wrong for the system as a whole.

The pre-phase fixes that by forcing the conversation to answer the hard questions first:
- Which layer should own this behavior?
- Which layer has the business context?
- Which data belongs in the low-level error contract?
- What must stay out of scope?

If those answers are written down first, the implementation is usually smaller, safer, and easier to review.
