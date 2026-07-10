# Database Development Guide

## Purpose

Explain the verified database workflow for the new root Football Platform API.

This guide describes the root application only. The database code and migrations under `legacy/`
are reference material and are not part of this workflow.

## Current Status

Implemented and statically validated in the repository:

```text
Local PostgreSQL in Docker
Drizzle schema declarations
Generated SQL migration history
Drizzle migration application
Non-destructive Almanac seed data
Drizzle-backed application queries
```

Awaiting engineer-led guide validation:

```text
Repeat migration and seed commands
Drizzle Studio inspection
Local API startup
Local database health and Almanac endpoint requests
```

Not configured yet:

```text
Hosted PostgreSQL for the Cloudflare demo
Cloudflare DATABASE_URL secret
GitHub Actions migration secret
Remote migration and seed execution
```

Do not use this guide to deploy database changes remotely until the hosted-database section is
completed and verified.

## Architecture

Normal local development uses three separate processes:

```text
Node/Express API on the engineer's machine
  -> Drizzle ORM
  -> PostgreSQL 16 in Docker

Drizzle Studio on the engineer's machine
  -> PostgreSQL 16 in Docker
```

Docker runs PostgreSQL only. The API and Drizzle Studio run directly on the host machine.

## Important Files

```text
docker-compose.yml
  Defines local PostgreSQL.

.env
  Contains the local DATABASE_URL. It is never committed.

.env.example
  Documents the expected local environment variables.

drizzle.config.ts
  Tells Drizzle Kit where schema declarations and migrations live.

drizzle/
  Contains generated SQL migrations and Drizzle migration metadata.

src/domains/*/schema.ts
  Contains the current TypeScript declarations for database tables.

src/core/database/index.ts
  Creates the postgres.js connection and Drizzle application client.

scripts/seed-almanac.ts
  Inserts or updates the small, known Almanac seed dataset without deleting rows.
```

Schema declarations describe the desired database shape. Migration files are the ordered history
that moves a real database from one shape to the next. Both belong in version control.

## First-Time Local Setup

From the repository root, install dependencies:

```sh
pnpm install
```

If `.env` does not exist, create it from the example:

```sh
cp .env.example .env
```

Start PostgreSQL:

```sh
pnpm db:up
```

Apply every pending migration:

```sh
pnpm db:migrate
```

Load the small Almanac seed dataset:

```sh
pnpm db:seed:almanac
```

Start the API:

```sh
pnpm dev
```

The API should be available at:

```text
http://localhost:3000
```

## Verify The Local Data Path

With the API running, use another terminal:

```sh
curl -i http://localhost:3000/api/health/db
curl -i http://localhost:3000/api/almanac/world-cups
```

Expected behavior:

```text
/api/health/db
  -> HTTP 200
  -> database.ok is true

/api/almanac/world-cups
  -> HTTP 200
  -> editions contains the seeded World Cup rows
```

An empty `world_cup_editions` table is valid. The endpoint returns HTTP 200 with an empty
`editions` array.

## Daily Development

Start PostgreSQL if it is not already running:

```sh
pnpm db:up
```

Apply migrations after pulling changes from another engineer:

```sh
pnpm db:migrate
```

Start the API:

```sh
pnpm dev
```

`pnpm db:up` and `pnpm db:migrate` are safe to run when PostgreSQL is already running and all
migrations are already applied.

## Inspect Data With Drizzle Studio

Start PostgreSQL first, then run:

```sh
pnpm db:studio
```

Keep that terminal running. Drizzle prints the local Studio URL; open that URL in a browser.

Use Studio to inspect tables and rows. Do not use Studio to make schema changes that exist only in
your local database. Schema changes must begin in a committed Drizzle schema declaration and
migration.

## Create Or Change A Table

### 1. Change The Domain Schema

Add or edit the appropriate file under:

```text
src/domains/<domain>/schema.ts
```

Keep table ownership with the product domain that owns the data.

### 2. Generate A Migration

Use a concise, descriptive migration name:

```sh
pnpm db:generate --name=describe_the_change
```

Generation compares the current schema declarations with Drizzle's committed schema snapshots. It
creates a new SQL migration and updated metadata under `drizzle/`.

### 3. Review The Generated SQL

Open the new `.sql` file under `drizzle/` and verify:

```text
Only the intended tables, columns, constraints, and indexes change.
No unrelated table is dropped or rewritten.
Potentially destructive operations are understood before application.
The migration name describes the change.
```

Do not apply generated SQL that you have not reviewed.

### 4. Validate Migration History

```sh
pnpm db:check
```

This checks the generated migration history for consistency.

### 5. Apply Locally

```sh
pnpm db:migrate
```

Drizzle records applied migrations in PostgreSQL. Running the command again applies only migrations
that have not already been recorded.

### 6. Verify The Application

```sh
pnpm run typecheck
pnpm run build
pnpm dev
```

Exercise the affected endpoint and inspect the resulting rows through Drizzle Studio.

### 7. Commit The Complete Change

A table change normally includes:

```text
domain schema declaration
generated SQL migration
generated Drizzle metadata
application query changes
seed changes when required
tests or documented validation
```

Never commit `.env` or a database connection string.

## Migrations Versus Seed Data

Migrations change database structure:

```text
create table
add column
add constraint
create index
```

The Almanac seed command creates a very small known dataset used to prove the product data
path:

```sh
pnpm db:seed:almanac
```

The seed command is designed to be repeatable. It updates rows by a stable source key and does
not truncate or delete existing rows.

Do not hide destructive test resets inside a command named `seed`.

## Command Reference

```text
pnpm db:up
  Start local PostgreSQL in the background.

pnpm db:down
  Stop local PostgreSQL containers. The named data volume is preserved.

pnpm db:logs
  Follow local PostgreSQL logs.

pnpm db:psql
  Open a PostgreSQL command-line session inside the container.

pnpm db:generate --name=<description>
  Generate SQL from schema declaration changes.

pnpm db:check
  Validate migration history consistency.

pnpm db:migrate
  Apply pending migrations to DATABASE_URL.

pnpm db:seed:almanac
  Insert or update the known Almanac seed rows.

pnpm db:studio
  Start the local Drizzle Studio database interface.
```

## Local Reset Safety

There is deliberately no `db:reset` command yet.

`pnpm db:down` stops PostgreSQL but preserves its Docker volume and data. Removing the volume is a
destructive operation and is not part of the normal workflow.

Before adding or running a local reset command, confirm that:

```text
the target is the local Docker database;
no useful local data needs to be retained;
the command cannot receive a hosted DATABASE_URL;
the engineer explicitly intends to delete all local data.
```

## Rules And Prohibited Shortcuts

- Do not reuse or apply migrations from `legacy/`.
- Do not edit a migration after it has been applied or shared. Create a new corrective migration.
- Do not use direct database schema edits as the source of truth.
- Do not add `db:push` as the normal workflow; it bypasses reviewed migration history.
- Do not commit secrets or connection strings.
- Do not run migrations automatically when an API container starts.
- Do not make a destructive migration and dependent application change as one unplanned release.
- Do not assume Game and Almanac entities with the same name share one data model.

## Troubleshooting

### Docker Is Not Running

If `pnpm db:up` cannot connect to the Docker daemon, start Docker Desktop and wait until it is ready.

### `DATABASE_URL` Is Missing

Database commands and the API require `DATABASE_URL`. Confirm `.env` exists and contains:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/football_platform
```

### PostgreSQL Is Unreachable

Check container state and logs:

```sh
pnpm db:up
pnpm db:logs
```

The expected local host port is `5433`.

### A Migration Fails

Stop and read the actual database error. Do not edit the generated migration or reset the database
until the cause is understood.

Check:

```text
PostgreSQL is running.
DATABASE_URL points to the intended database.
The generated SQL contains only the intended change.
The migration was not previously modified or partially applied.
```

If a migration has already been applied, fix it with a new forward migration.

## Hosted Database And Cloudflare

This section is intentionally incomplete until the hosted PostgreSQL project is selected and the
full deployed path is verified.

The accepted direction is:

```text
GitHub Actions holds the migration connection secret.
Cloudflare holds the application runtime DATABASE_URL secret.
The Worker passes DATABASE_URL into the Node container.
CI applies additive migrations before deploying code that requires them.
The API container never performs migrations during startup.
```

Do not add real secret values to this guide. Once verified, this section must document the exact
secret names, migration order, deployment command, and recovery behavior.

## Guide Verification

This guide is tested by having an engineer follow it without undocumented assistance.

Record any unclear instruction, unexpected output, missing prerequisite, or required guess. Treat
that friction as a documentation defect and update the guide.
