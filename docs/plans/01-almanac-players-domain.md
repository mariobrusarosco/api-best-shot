# Ticket 01: Almanac Players Domain

## Status

- [x] Completed on 2026-07-17

## Objective

Create the Players persistence foundation as a small, independently reviewable slice: domain-owned
types, schema, one migration, and an idempotent seed.

## Data Ownership

The Players domain owns `almanac.players`. A player is a reusable person identity and is not a
World Cup squad membership.

Proposed columns:

| Column | Purpose |
| --- | --- |
| `id` | PostgreSQL UUID primary key |
| `source_key` | Unique stable source player ID |
| `given_name` | Nullable given name |
| `family_name` | Required family name |
| `display_name` | Required API display value |
| `birth_date` | Nullable date |
| `wikipedia_url` | Nullable source URL |
| `created_at`, `updated_at` | Audit timestamps |

## Files And Systems Affected

- `src/products/almanac/domains/players/`
- One new Drizzle migration and its metadata.
- `scripts/seed-almanac/players.ts`
- `scripts/seed-almanac.ts`
- `docs/almanac-schema.md`

## Implementation Checklist

- [x] Add the validated player source shape to `players/types.ts`.
- [x] Add `players/schema.ts` with constraints and a unique source-key index.
- [x] Generate exactly one Players migration.
- [x] Add an idempotent seed from `docs/validated-data/db/players.json`.
- [x] Import the player source type from the Players domain; do not define it in the seed file.
- [x] Seed all 7,672 validated players.
- [x] Mark the Players schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [x] A clean database migrates successfully.
- [x] Running the Almanac seed twice leaves exactly 7,672 players.
- [x] Existing Editions and Teams behavior is unchanged.
- [x] No Players repository, service, or HTTP route is introduced without concrete behavior.
- [x] No product-domain type is declared inside the seed file.

## Verification

```sh
pnpm db:check
pnpm db:migrate
pnpm db:seed:almanac
pnpm db:seed:almanac
pnpm typecheck
pnpm build
```

## Explicitly Excluded

- Squad membership.
- Players repository, service, and HTTP routes.
- Player appearances, awards, bookings, or substitutions.
- Matches, goals, and aggregate scoring calculations.
- The `/api/almanac/about` endpoint.
