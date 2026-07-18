# Ticket 02: Almanac Participations Domain

## Status

- [ ] Ready for implementation

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
- One new Drizzle migration and its metadata.
- `scripts/seed-almanac/world-cup-edition-teams.ts`
- `scripts/seed-almanac.ts`
- Existing edition seed data for the validated 1950-2022 source set.
- `docs/adr/` and the canonical architecture documentation.
- `docs/almanac-schema.md`
- Focused Participations tests.

## Implementation Checklist

- [ ] Add `participations/schema.ts` with edition and team foreign keys.
- [ ] Enforce one participation per edition/team pair.
- [ ] Add constraints for positive positions and non-negative statistics.
- [ ] Generate exactly one Participations migration.
- [ ] Extend edition seeding to the complete validated 1950-2022 source set.
- [ ] Verify tournament and participation identifiers against the validated POC source.
- [ ] Record the accepted schema-only same-product foreign-key dependency rule in an ADR.
- [ ] Keep routes, services, and repositories prohibited from importing another domain's schema or
  repository.
- [ ] Add an idempotent seed from `world_cup_teams.json`.
- [ ] Seed all 445 validated edition-team participations.
- [ ] Add repository reads for ordered champions and edition participation facts.
- [ ] Add a public Participations service that maps persistence records into domain results.
- [ ] Add focused schema, seed, and service tests.
- [ ] Mark the Participations schema as implemented in `docs/almanac-schema.md`.

## Acceptance Criteria

- [ ] A clean database migrates successfully.
- [ ] Running the Almanac seed twice leaves 19 editions and exactly 445 participations.
- [ ] Every participation resolves to an existing edition and national team.
- [ ] Champion order and title years can be derived from participation records without stored
  aggregate tables.
- [ ] Existing Editions and Teams API contracts remain unchanged unless an explicit contract change
  is documented in this ticket.

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

- Squad players.
- Match and goal records.
- Cached champion or title-drought aggregate tables.
- The `/api/almanac/about` endpoint.
