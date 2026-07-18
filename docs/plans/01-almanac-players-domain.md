# Ticket 01: Almanac Players Domain

## Status

- [ ] Blocked by Ticket 00

## Objective

Create the Players domain as a small, independently reviewable vertical slice: schema, one
migration, idempotent seed, repository, and public service behavior needed by later Almanac work.

## Dependency

- Ticket 00: Almanac Historical Source Foundation.

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
- Focused Players tests.

## Implementation Checklist

- [ ] Add `players/schema.ts` with constraints and a unique source-key index.
- [ ] Generate exactly one Players migration.
- [ ] Add an idempotent seed from `docs/validated-data/db/players.json`.
- [ ] Seed all 7,672 validated players.
- [ ] Add `players/repository.ts` for persistence reads required by future composition.
- [ ] Add `players/service.ts` as the domain's public behavior boundary.
- [ ] Keep database row types separate from public service result types.
- [ ] Add focused schema, seed, and service tests.
- [ ] Mark the Players schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [ ] A clean database migrates successfully.
- [ ] Running the Almanac seed twice leaves exactly 7,672 players.
- [ ] Existing Editions and Teams behavior is unchanged.
- [ ] The Players service does not import Drizzle, the database, or schema modules.
- [ ] No HTTP route is added solely to expose raw player records.

## Verification

```sh
pnpm db:check
pnpm db:migrate
pnpm db:seed:almanac
pnpm db:seed:almanac
pnpm test
pnpm typecheck
pnpm build
```

## Explicitly Excluded

- Squad membership.
- Player appearances, awards, bookings, or substitutions.
- Matches, goals, and aggregate scoring calculations.
- The `/api/almanac/about` endpoint.

