# Slice: Almanac Editions Database

## Purpose

Build the smallest complete database-backed Almanac feature and prove the same application flow
against local PostgreSQL and the deployed Cloudflare demo environment.

This is a new Almanac implementation. Legacy database tooling and operational lessons are reference
material only. No legacy schema, migration, table, or Almanac model is reused.

## Goal

Prove this path works:

```text
Local:
HTTP request
  -> Node/Express API
  -> Drizzle ORM
  -> Docker PostgreSQL
  -> editions response

Deployed demo:
HTTP request
  -> Cloudflare Worker
  -> Cloudflare Container
  -> Node/Express API
  -> Drizzle ORM
  -> hosted PostgreSQL
  -> editions response
```

## Product Scope

Create one Almanac-owned table representing World Cup editions and one lightweight endpoint for the
editions index.

Proposed endpoint:

```text
GET /api/almanac/world-cups
```

Proposed response meaning:

```text
A lightweight chronological list of World Cup editions containing only the fields needed to prove
the editions index data path. This is not the final edition-detail contract.
```

## Decisions

- Keep PostgreSQL as the database.
- Keep the existing PostgreSQL 16 Docker service for local development.
- Run the Node/Express API directly on the engineer's machine during normal local development.
- Use Drizzle ORM for typed application queries.
- Use Drizzle Kit for generated, committed, and reviewed SQL migrations.
- Use Drizzle Studio as the local graphical database interface.
- Do not run the full Supabase stack locally.
- Start a completely new migration history for the root application.
- Keep migration files owned by this application rather than placing them under `legacy/`.
- Do not add `db:push` as the normal schema-change workflow.
- Use an idempotent, non-destructive seed command for the small editions dataset.
- Apply remote migrations outside application startup.
- Apply additive migrations before deploying code that depends on them.
- Keep the first deployed database environment aligned with the existing Cloudflare demo deployment.
- Use one new PostgreSQL project and database per environment.
- Separate product ownership inside an environment with PostgreSQL schemas.
- Use `almanac` for Almanac data and `best_shot` for the Best Shot score-prediction game.
- Give future games their own schemas instead of placing them under a generic `game` schema.
- Keep one ordered Drizzle migration history while this remains one deployable application.

## Database Boundary Decision

The platform will contain at least two product domains:

```text
Best Shot = the score-prediction product rebuilt from legacy product knowledge
Almanac   = the new historical football product
```

They may use different data models even when entities have the same everyday name. For example, an
Almanac player is not automatically the same domain entity as a Best Shot player.

The accepted boundary is:

```text
one new PostgreSQL project and database per environment
almanac.* for Almanac product tables
best_shot.* for Best Shot product tables
a separate schema for every future game
public.__drizzle_migrations for the shared migration ledger
```

Product table prefixes in `public` and a generic `game` schema were rejected. The complete decision,
tradeoffs, and extraction triggers are recorded in
[ADR 0001: Database Domain Boundaries](../adr/0001-database-domain-boundaries.md).

Still deferred:

- whether a future Identity domain maps corresponding real-world people across products;
- the complete Almanac schema;
- whether measured operational needs eventually justify extracting a domain into another database.

## Non-Goals

Do not build:

- players;
- teams or squads;
- matches or goals;
- Best Shot domain tables;
- cross-domain identity mapping;
- the complete World Cup edition detail response;
- provider ingestion;
- an automated post-deploy smoke-test gate;
- staging or production environments.

## Checklist

### 1. Confirm The Deployed Database Boundary

- [ ] Confirm that the first deployed database is a brand-new hosted PostgreSQL project and does not
      reuse the legacy database.
- [ ] Confirm the hosted PostgreSQL provider for the Cloudflare demo environment.
- [ ] Obtain the runtime and migration connection information without committing credentials.
- [ ] Record which connection mode is used by the persistent Cloudflare Container and by migrations.

### 2. Establish The Root Database Tooling

- [x] Add `drizzle-orm` as an application dependency.
- [x] Add `drizzle-kit` as a development dependency.
- [x] Add a root `drizzle.config.ts`.
- [x] Configure a new root-owned migration directory.
- [x] Add `db:generate`, `db:migrate`, `db:check`, and `db:studio` scripts.
- [x] Keep the existing `db:up`, `db:down`, `db:logs`, and `db:psql` scripts.
- [x] Do not add `db:push` to the normal workflow.
- [x] Make missing deployed `DATABASE_URL` configuration fail clearly instead of falling back to
      local PostgreSQL.

### 3. Create The First Almanac Table

- [x] Decide the minimal edition fields from the frontend contract notes.
- [x] Add the Drizzle schema in the Almanac domain.
- [x] Use an internal UUID primary key.
- [x] Preserve one stable external/source key without using a display name as identity.
- [x] Add only the constraints and indexes required by this slice.
- [x] Generate the first root migration with a descriptive name.
- [x] Review the generated SQL before applying it.
- [x] Commit the first generated SQL and Drizzle migration metadata.
- [x] Record the database ownership decision in ADR 0001.
- [x] Declare `almanac` as a PostgreSQL schema through Drizzle.
- [x] Generate a forward migration that moves the existing table into `almanac`.
- [x] Keep migration `0000` unchanged.
- [x] Verify that the move preserves rows, UUIDs, constraints, and indexes.
- [ ] Commit ADR 0001, the Drizzle schema change, migration `0001`, and its metadata.

### 4. Add Seed Data

- [x] Add an explicit Almanac seed script containing a very small known edition dataset.
- [x] Make the script safe to run repeatedly through a stable conflict key.
- [x] Do not delete or truncate existing rows.
- [x] Add a `db:seed:almanac` command.

### 5. Add The Read Path

- [x] Create an Almanac database query/repository boundary.
- [x] Query editions through Drizzle rather than raw mock data.
- [x] Add `GET /api/almanac/world-cups`.
- [x] Return a lightweight screen-oriented response.
- [x] Define consistent behavior for an empty editions table.
- [x] Keep the existing `/api/almanac/hello` endpoint during this slice.

### 6. Verify The Local Developer Experience

- [x] Start local PostgreSQL with `pnpm db:up`.
- [x] Apply the migration with `pnpm db:migrate`.
- [x] Run the seed command once.
- [x] Open and inspect the table with `pnpm db:studio`.
- [x] Start the API with `pnpm dev`.
- [x] Verify `/api/health/db` returns HTTP 200.
- [x] Verify `GET /api/almanac/world-cups` returns the seed data.
- [x] Run typecheck and build.

### 7. Connect The Cloudflare Container To Hosted PostgreSQL

- [ ] Store the runtime database URL as an encrypted Cloudflare Worker secret.
- [ ] Declare the runtime database secret as required deployment configuration.
- [ ] Forward the Worker secret into the Node container as `DATABASE_URL`.
- [ ] Store the migration connection URL as an encrypted GitHub Actions secret.
- [ ] Do not place either connection string in `wrangler.toml`, the Docker image, source files, or
      workflow logs.

### 8. Extend The Manual Demo Deployment

- [ ] Install dependencies from the lockfile in GitHub Actions.
- [ ] Run migration validation before deployment.
- [ ] Apply pending additive migrations to the hosted demo database before deploying dependent code.
- [ ] Run the idempotent Almanac seed for the demo dataset.
- [ ] Deploy the Worker and Container with Wrangler.
- [ ] Keep the workflow manual for this slice.
- [ ] Do not add automated route retries or rollback behavior in this slice.

### 9. Verify The Deployed Data Path

- [ ] Run the manual Cloudflare demo workflow successfully.
- [ ] Verify deployed `/api/health/db` returns HTTP 200.
- [ ] Verify deployed `GET /api/almanac/world-cups` returns the expected edition data.
- [ ] Confirm the response came from hosted PostgreSQL rather than a bundled mock or fallback.
- [ ] Record the deployed validation result in this document.

### 10. Document The Proven Database DX

- [x] Create `docs/guides/database-development.md` from the commands and behavior actually
      validated in this slice.
- [x] Explain local architecture and daily commands.
- [x] Explain how to create or alter a table.
- [x] Explain migration generation, SQL review, application, and history.
- [x] Explain seed data versus destructive test fixtures.
- [x] Explain Drizzle Studio.
- [x] Explain local reset safety.
- [ ] Explain GitHub and Cloudflare database-secret ownership.
- [ ] Explain remote migration and deployment ordering.
- [x] Document prohibited shortcuts and troubleshooting.
- [x] Update the root `README.md` to link to the guide.

## Local Implementation Record

Completed on 2026-07-10:

```text
pnpm db:generate --name=almanac_world_cup_editions
pnpm db:check
pnpm db:up
pnpm db:migrate
pnpm db:seed:almanac
pnpm run typecheck
pnpm run build
pnpm db:generate --name=move_world_cup_editions_to_almanac_schema
pnpm db:migrate
pnpm db:migrate
pnpm db:seed:almanac
pnpm db:seed:almanac
```

The migration was reviewed before it was applied. It creates only `world_cup_editions`, its check
constraint, and its two unique indexes.

The engineer-led local walkthrough was completed successfully. Migration `0001` creates the
`almanac` schema and moves the table without dropping or rebuilding it. The table exists only as
`almanac.world_cup_editions`; both original UUIDs and all three indexes were preserved. Two
consecutive seed runs left exactly two rows, and a repeat migration run left exactly two applied
migrations in Drizzle's ledger.

After the schema move, `/api/health/db`, `/api/almanac/world-cups`, and `/api/almanac/hello` all
returned HTTP 200 locally. The editions response and UUIDs were unchanged.

No hosted PostgreSQL project, Cloudflare database secret, remote migration, or deployed database
endpoint has been configured by this work.

## Done Criteria

This slice is done when:

- [x] A new root-owned migration creates exactly one Almanac product table.
- [x] Engineers can generate, review, apply, inspect, and evolve the database locally through the
      documented pnpm commands.
- [x] The local endpoint returns data from Docker PostgreSQL.
- [ ] The deployed endpoint returns data from hosted PostgreSQL through the Cloudflare Container.
- [x] No legacy database or migration is reused.
- [x] The database DX guide describes the verified implementation.
- [x] Cross-domain Almanac/Best Shot ownership and naming are recorded in ADR 0001.
