# Football Platform API Root Reset Plan

## Purpose

This repository is being reset into a simpler v1 app at the root level.

The existing app was moved into `legacy/` only as reference material. It should help us understand the product, database, old routes, and old domain behavior, but it is not the place where new work happens.

## Ground Rules

```text
legacy/ = reference only
root/ = new app
```

Do not deploy `legacy/`.

Do not build new features inside `legacy/`.

Do not copy legacy code forward by default.

Every old idea has to earn its way back into the new app.

## What We Are Building

Football Platform API supports football products including Game, Almanac, Provider, Identity, and Admin domains.

The app needs to:

```text
1. Serve product data from our database
2. Get real football data from a provider
3. Let users make guesses
4. Update match results
5. Calculate points and leaderboards
```

The API should serve our own database. User requests should not depend on live provider calls.

## What We Keep For v1

Keep the first version small:

```text
Node API
local Postgres
environment config
health endpoint
basic database connectivity check
simple scripts to run/build/start
```

Docker is allowed only for local infrastructure:

```text
docker compose up -d postgres
```

The API itself should run directly through Node during local development.

## What We Leave Behind For Now

These are not part of the new root baseline:

```text
old Data Provider V2 architecture
old scheduler engine
Playwright production setup
Cloudflare Browser Run probes
Redis
S3 report uploads
Slack notifications
Sentry sourcemap upload
AI/Ollama/OpenAI code
generic operation runners
large admin surface
multi-environment script sprawl
production Dockerfile
```

They can come back later only if a real slice needs them.

## Runtime Shape

For the initial reset:

```mermaid
flowchart LR
  A["Node API at root"] --> B["Local Postgres via Docker"]
  A --> C["Health endpoint"]
  A --> D["Future product routes"]
```

No scheduler yet.

No Cloudflare yet.

No provider worker yet.

## Local Database

We still need a local database.

Use Docker only for Postgres:

```text
Docker Compose service: postgres
localhost:5433
database: football_platform
user: postgres
password: postgres
```

Root env should point to:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/football_platform
```

## First Technical Baseline

The first root baseline should prove:

```text
1. The API boots
2. /health returns OK
3. local Postgres can start
4. /health/db can verify DB connectivity
5. TypeScript build passes
```

This is infrastructure, not product scope.

## First Product Slice

Do not start with the full app.

The first product slice should be small and provider-aware, but not a full tournament import.

Candidate:

```text
Admin provider preview
```

Flow:

```text
admin enters SofaScore tournament URL
app fetches provider data
app returns a preview or a clean error
no database writes at first
```

This proves the hardest external dependency without committing to schema, scoring, admin CRUD, or automation too early.

## Decisions To Make Next

Before adding more code, decide:

```text
1. Do we accept the minimal root baseline?
2. Which package manager do we want for the new app: npm, yarn, or pnpm?
3. Which database/migration tool do we want for v1?
4. What is the exact first product slice?
5. Which legacy concepts must be read before implementing that slice?
```

## Current Working Agreement

When scope is sensitive:

```text
plan first
pause
then implement only after approval
```

