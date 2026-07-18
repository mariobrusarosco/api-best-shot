# Ticket 02: Almanac Participations Domain

## Status

- [x] Completed

## Objective

Create the Participations domain that connects a national team to one World Cup edition and stores
the validated edition-specific finish and tournament statistics.

## Dependencies

- Existing Editions and Teams domains.

## Data Ownership

The Participations domain owns `almanac.world_cup_edition_teams`.

Each row means:

```text
one national team participated in one World Cup edition
```

It stores the validated final position, final stage, and tournament totals needed to derive
champions and title droughts. It does not represent a reusable team or a player roster.

## Files And Systems Affected

- `src/products/almanac/domains/participations/`
- `src/products/almanac/domains/editions/types.ts`
- `src/products/almanac/domains/teams/types.ts`
- One new Drizzle migration and its metadata.
- `scripts/seed-almanac/world-cup-edition-teams.ts`
- `scripts/seed-almanac.ts`
- Existing edition seed data for the validated 1950-2022 source set.
- `docs/adr/` and the canonical architecture documentation.
- `docs/almanac-schema.md`

## Implementation Checklist

- [x] Add domain-owned Participations source and seed types to `participations/types.ts`.
- [x] Add `participations/schema.ts` with edition and team foreign keys.
- [x] Enforce one participation per edition/team pair.
- [x] Defer value-level `CHECK` constraints until their rules are explicitly required.
- [x] Generate exactly one Participations migration.
- [x] Extend edition seeding to the complete validated 1950-2022 source set.
- [x] Verify tournament and participation identifiers against the validated POC source.
- [x] Record the accepted schema-only same-product foreign-key dependency rule in an ADR.
- [x] Keep routes, services, and repositories prohibited from importing another domain's schema or
  repository.
- [x] Add an idempotent seed from `world_cup_teams.json`.
- [x] Seed all 445 validated edition-team participations.
- [x] Mark the Participations schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [x] A clean database migrates successfully.
- [x] Running the Almanac seed twice leaves 19 editions and exactly 445 participations.
- [x] Every participation resolves to an existing edition and national team.
- [x] Champion order and title years can be derived from participation records without stored
  aggregate tables.
- [x] Existing Editions and Teams API contracts remain unchanged unless an explicit contract change
  is documented in this ticket.

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

- Squad players.
- Match and goal records.
- Cached champion or title-drought aggregate tables.
- The `/api/almanac/about` endpoint.
- Participations repositories, services, routes, and public API contracts.
