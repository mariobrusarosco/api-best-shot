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
- "How do we navigate and read provider JSON safely?"

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
- some workflows are naturally batch-oriented
- shared runtime ownership can be valid when the workflow benefits from reuse

So `runtime` is a workflow-owned browser resource whose lifetime depends on the workflow shape.

### Why We Need Session

`BrowserSession` in `browser-session.ts` owns:

- one `BrowserContext`
- one `Page`
- default timeouts
- default viewport / user-agent
- cleanup of that isolated context/page

Why that matters:

- sessions isolate cookies, storage, page state, and request side effects
- they are the shared Playwright workspace abstraction used by providers
- a workflow may choose one session per operation or one shared session for a batch, depending on the workflow

So `session` is the reusable browser workspace abstraction.

### Why Not Just One Class

We could have shoved both into one object, but then we would mix two lifecycles:

- browser lifecycle
- per-operation/session lifecycle

Those are different.

We keep both because browser lifetime and browser workspace lifetime are separate decisions.

Two valid shapes now exist in V2:

```text
single operation
-> create runtime
-> create session
-> do provider work
-> close session
-> close runtime
```

and

```text
batch
-> create runtime
-> create session
-> run many tournament operations through that shared session
-> close session
-> close runtime
```

That is why both exist.

### Concrete Example

`open-match-sync` and `standings-update` currently use:

```text
runtime = launch browser once
session = create one shared workspace

process tournament A
process tournament B
process tournament C

close session
close runtime
```

`standings-create` currently uses:

```text
runtime = launch browser once
session = create one workspace
process one tournament
close session
close runtime
```

### Architectural Reason

This split also protects the boundaries we agreed on:

- `runtime` stays generic infrastructure
- `session` stays generic infrastructure
- later, `browser-request.ts` will use a session
- later, `match-provider.ts` will use the request helper
- `use-cases/` and `operations/` do not need to know Playwright internals

## Request Flow

Current shared request flow:

```text
use-case / provider
    |
    v
BrowserRequest.fetchJson(...)
    |
    v
BrowserSession.getPage()
    |
    v
page.goto(url)
    |
    +--> navigation failure
    |      -> throw BrowserRequestTransportError
    |
    +--> 403 challenge response
    |      -> wait briefly
    |      -> navigate once more
    |
    +--> HTTP response received
           |
           +--> response.ok === false
           |      -> return structured response
           |         { ok: false, status, requestUrl, responseUrl, data?, responseBodySnippet? }
           |
           +--> response.ok === true
                  |
                  +--> valid JSON in <pre> or body
                  |      -> return structured response
                  |
                  +--> invalid JSON
                         -> throw BrowserRequestTransportError
```

Meaning:

- transport asks: "Did browser navigation technically work?"
- transport asks: "What status came back?"
- transport asks: "Did the page contain valid JSON?"

It does **not** ask whether `404` is expected for any particular workflow.

## Layered Flow

Once the provider and use-case layers sit on top of transport, the full flow becomes:

```text
runTournamentOpenMatchSync (use-case)
    |
    v
SofaScoreMatchProvider.fetchMatchEvent(...)
    |
    v
BrowserRequest.fetchJson(...)
    |
    v
page.goto(url)
    |
    +--> BrowserRequestTransportError
    |      -> provider turns this into ProviderRequestError
    |      -> use-case may classify it as unexpected_failure
    |
    +--> structured HTTP response with status/data
           |
           +--> provider layer
           |      - "This is SofaScore match-event data"
           |      - "Build the endpoint URL"
           |      - "Turn transport errors/results into provider errors"
           |
           +--> use-case layer
                  - "Is 404 expected here?"
                  - "Does this become provider_match_not_found?"
                  - "Should this affect summary/report/Slack?"
```

Short version:

- `transport` = mechanics
- `provider` = provider meaning
- `use-case` = business meaning
