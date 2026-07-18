# Ticket 03: Almanac Squads Domain

## Status

- [x] Completed

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

## Implementation Checklist

- [x] Add domain-owned Squads source types to `squads/types.ts`.
- [x] Add `squads/schema.ts` with participation and player foreign keys.
- [x] Enforce one roster membership per participation/player pair.
- [x] Keep shirt number nullable and represent the validated position codes without adding `CHECK`
  constraints yet.
- [x] Generate exactly one Squads migration.
- [x] Verify membership identifiers against the validated POC source.
- [x] Add an idempotent seed from `world_cup_squads.json`.
- [x] Seed all 10,066 validated squad-player memberships.
- [x] Mark the Squads schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [x] A clean database migrates successfully.
- [x] Running the Almanac seed twice leaves exactly 10,066 squad-player memberships.
- [x] Every membership resolves to an existing player and edition-team participation.
- [x] No reusable player attributes are duplicated into the squad table.
- [x] No Squads repository, service, route, or public API contract is introduced.

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

- Match appearances and lineups.
- Goals, bookings, substitutions, and awards.
- A public Squads screen endpoint.
- The `/api/almanac/about` endpoint.
- Squads repositories, services, routes, and public API contracts.
