# Ticket 04: Almanac Matches Domain

## Status

- [ ] Blocked by Tickets 02 and 03

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
- Focused Matches tests.

## Implementation Checklist

- [ ] Add `matches/schema.ts` with match and goal declarations.
- [ ] Reference edition-team participations for home, away, benefiting, and credited teams.
- [ ] Reference squad membership for a credited scorer when the source provides one.
- [ ] Preserve own-goal and penalty semantics from validated goal data.
- [ ] Add score, penalty-shootout, team-distinction, and minute constraints.
- [ ] Generate exactly one Matches migration for both owned tables.
- [ ] Add `matches.json` from the validated POC match source.
- [ ] Verify that tournament, team, match, player, squad, and goal references resolve.
- [ ] Add an idempotent match seed from `matches.json`.
- [ ] Add an idempotent goal seed from `goals.json`.
- [ ] Seed exactly 911 matches and 2,496 goals.
- [ ] Add repository reads for credited non-own-goal scorer totals.
- [ ] Add a public Matches service that exposes scorer aggregates without HTTP concerns.
- [ ] Add focused schema, seed, own-goal, and scorer-aggregation tests.
- [ ] Mark the Matches schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [ ] A clean database migrates successfully.
- [ ] Running the Almanac seed twice leaves exactly 911 matches and 2,496 goals.
- [ ] Every goal resolves to a match and benefiting participation.
- [ ] Credited scorer totals exclude own goals from the credited player's tally.
- [ ] Representative totals include Miroslav Klose with 16 World Cup goals.
- [ ] No precomputed top-scorer table is introduced.

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

- Full match-detail API responses.
- Lineups, appearances, bookings, substitutions, penalties, referees, and stadiums.
- Cached leaderboard tables.
- The `/api/almanac/about` endpoint.
