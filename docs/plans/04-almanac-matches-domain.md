# Ticket 04: Almanac Matches Domain

## Status

- [x] Completed

## Objective

Create the Matches domain with normalized match and goal events, one migration, idempotent seeds,
and the public domain behavior required to calculate historical scoring records.

## Dependencies

- Ticket 02: Participations Domain.
- Ticket 03: Squads Domain.

## Data Ownership

The Matches domain owns:

- `almanac.matches`
- `almanac.goals`

Goals remain in this domain because they are events within a match. Keeping both tables in one
domain avoids inventing a separate Goals domain before independent behavior requires one.

## Files And Systems Affected

- `src/products/almanac/domains/matches/`
- One new Drizzle migration containing both match and goal tables.
- `docs/validated-data/db/matches.json`
- `scripts/seed-almanac/matches.ts`
- `scripts/seed-almanac/goals.ts`
- `scripts/seed-almanac.ts`
- `docs/almanac-schema.md`

## Implementation Checklist

- [x] Add `matches/schema.ts` with match and goal declarations.
- [x] Reference edition-team participations for home, away, benefiting, and credited teams.
- [x] Reference squad membership for a credited scorer when the source provides one.
- [x] Preserve own-goal and penalty semantics from validated goal data.
- [x] Keep source-validated score and minute values without speculative indexes or `CHECK`
      constraints.
- [x] Generate exactly one Matches migration for both owned tables.
- [x] Add `matches.json` from the validated POC match source.
- [x] Verify that tournament, team, match, player, squad, and goal references resolve.
- [x] Add an idempotent match seed from `matches.json`.
- [x] Add an idempotent goal seed from `goals.json`.
- [x] Seed exactly 911 matches and 2,496 goals.
- [x] Add a repository read for credited non-own-goal totals by squad membership.
- [x] Add a public Matches service that exposes those aggregates without HTTP concerns.
- [x] Verify own-goal attribution and representative scorer totals against seeded data.
- [x] Mark the Matches schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [x] A clean database migrates successfully.
- [x] Running the Almanac seed twice leaves exactly 911 matches and 2,496 goals.
- [x] Every goal resolves to its match, participations, and credited squad membership.
- [x] Credited scorer totals exclude own goals from the credited player's tally.
- [x] Representative totals include Miroslav Klose with 16 World Cup goals.
- [x] No precomputed top-scorer table is introduced.

## Verification

```sh
pnpm db:check
pnpm db:migrate
pnpm db:seed:almanac
pnpm typecheck
pnpm build
```

## Explicitly Excluded

- Full match-detail API responses.
- Lineups, appearances, bookings, substitutions, penalties, referees, and stadiums.
- Cached leaderboard tables.
- The `/api/almanac/about` endpoint.
- Query-performance indexes and value-level `CHECK` constraints.
- New test-runner infrastructure.
