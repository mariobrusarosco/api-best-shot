# Ticket 03: Almanac Squads Domain

## Status

- [ ] Blocked by Tickets 01 and 02

## Objective

Create the Squads domain that records which players belonged to a national team's roster for a
specific World Cup edition.

## Dependencies

- Ticket 01: Players Domain.
- Ticket 02: Participations Domain.

## Data Ownership

The Squads domain owns `almanac.world_cup_squad_players`.

Each row connects one player to one edition-team participation and stores roster-specific facts,
such as shirt number and position. Reusable player identity remains owned by Players.

## Files And Systems Affected

- `src/products/almanac/domains/squads/`
- One new Drizzle migration and its metadata.
- `scripts/seed-almanac/world-cup-squad-players.ts`
- `scripts/seed-almanac.ts`
- `docs/almanac-schema.md`
- Focused Squads tests.

## Implementation Checklist

- [ ] Add `squads/schema.ts` with participation and player foreign keys.
- [ ] Enforce one roster membership per participation/player pair.
- [ ] Enforce valid shirt-number and position-code values.
- [ ] Generate exactly one Squads migration.
- [ ] Add an idempotent seed from `world_cup_squads.json`.
- [ ] Seed all 10,066 validated squad-player memberships.
- [ ] Add repository reads needed to resolve scorer identity and represented team.
- [ ] Add a public Squads service for those domain results.
- [ ] Add focused schema, seed, and service tests.
- [ ] Mark the Squads schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [ ] A clean database migrates successfully.
- [ ] Running the Almanac seed twice leaves exactly 10,066 squad-player memberships.
- [ ] Every membership resolves to an existing player and edition-team participation.
- [ ] No reusable player attributes are duplicated into the squad table.
- [ ] The Squads repository imports only its own schema and the platform database boundary.

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

- Match appearances and lineups.
- Goals, bookings, substitutions, and awards.
- A public Squads screen endpoint.
- The `/api/almanac/about` endpoint.

