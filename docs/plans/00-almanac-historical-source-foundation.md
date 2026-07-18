# Ticket 00: Almanac Historical Source Foundation

## Status

- [ ] Ready for implementation

## Objective

Prepare the validated historical source data and record the dependency decision required by the
Players, Participations, Squads, and Matches domains. This ticket does not create database tables.

## Why This Is First

The domain tickets must consume stable, reviewable source files. They must not each reinterpret the
POC CSV files or make a different cross-domain relationship decision.

## Scope

- Restore the validated men's World Cup edition source set for 1950 through 2022.
- Add the validated match source data needed by the Matches ticket.
- Preserve the existing validated player, squad, goal, team, and participation source files.
- Record how same-product database foreign keys are declared without allowing repositories or
  services to bypass domain boundaries.
- Update the schema reference only with accepted ownership and relationship decisions.

## Implementation Checklist

- [ ] Verify the source counts and identifiers against the POC CSV dataset.
- [ ] Update `docs/validated-data/db/tournaments.json` with the validated 1950-2022 editions.
- [ ] Add `docs/validated-data/db/matches.json` from the validated match records.
- [ ] Confirm that match IDs referenced by `goals.json` exist in `matches.json`.
- [ ] Confirm that team, player, tournament, and match references resolve.
- [ ] Add an ADR for schema-only same-product foreign-key imports.
- [ ] Keep routes, services, and repositories prohibited from importing another domain's schema or
  repository.
- [ ] Update `docs/almanac-schema.md` with accepted future ownership only; do not declare tables as
  implemented before their domain tickets land.

## Acceptance Criteria

- [ ] The repository contains the complete validated source inputs needed by tickets 01-04.
- [ ] Referential validation reports no missing tournament, team, player, or match identifiers.
- [ ] The architecture decision changes no runtime code and introduces no CI enforcement.
- [ ] No migration is generated in this ticket.
- [ ] No seed command writes historical domain records in this ticket.

## Verification

```sh
pnpm typecheck
pnpm build
```

Add a deterministic source-validation command or test if one is needed to prove referential
integrity. Keep that validation scoped to the checked-in source files.

## Explicitly Excluded

- PostgreSQL tables or migrations.
- Product-domain runtime code.
- The `/api/almanac/about` endpoint.
- New historical identity decisions not already represented by the validated source data.

