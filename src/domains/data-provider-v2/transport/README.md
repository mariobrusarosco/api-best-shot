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

## Rationale

In practice:

- `runtime` = the whole Playwright engine we keep alive for a batch
- `session` = one isolated workspace inside that engine for one operation

A good mental model is:

- `PlaywrightRuntime` = the building
- `BrowserSession` = one room inside the building

### Why We Need Runtime

`PlaywrightRuntime` in `runtime.ts` owns:

- launching Chromium
- holding the shared `Browser`
- shutting it down
- creating sessions

Why that matters:

- browser launch is expensive
- we do not want to launch a brand new browser per match
- for a scheduler batch, we can launch once and reuse it

So `runtime` is the batch-level resource.

### Why We Need Session

`BrowserSession` in `browser-session.ts` owns:

- one `BrowserContext`
- one `Page`
- default timeouts
- default viewport / user-agent
- cleanup of that isolated context/page

Why that matters:

- contexts isolate cookies, storage, page state, and request side effects
- if tournament A dirties page/session state, tournament B should not inherit it
- operations are tournament-scoped, so one tournament should get one isolated browser session

So `session` is the operation-level resource.

### Why Not Just One Class

We could have shoved both into one object, but then we would mix two lifecycles:

- browser lifecycle
- per-operation/session lifecycle

Those are different.

We want this shape:

```text
one scheduler batch
-> create one runtime
-> for each tournament operation:
   -> create one session
   -> do provider work
   -> close session
-> close runtime
```

That is why both exist.

### Concrete Example

Imagine the batch finds due matches for 3 tournaments:

- tournament A
- tournament B
- tournament C

What we want:

```text
runtime = launch browser once

session A = isolated context/page
-> process tournament A
-> close session A

session B = isolated context/page
-> process tournament B
-> close session B

session C = isolated context/page
-> process tournament C
-> close session C

close runtime
```

Benefits:

- only one browser launch
- each tournament still gets isolation
- easier cleanup
- easier future concurrency if we ever want it

### Architectural Reason

This split also protects the boundaries we agreed on:

- `runtime` stays generic infrastructure
- `session` stays generic infrastructure
- later, `browser-request.ts` will use a session
- later, `match-provider.ts` will use the request helper
- `use-cases/` and `operations/` do not need to know Playwright internals
