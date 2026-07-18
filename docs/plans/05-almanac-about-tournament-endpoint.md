# Ticket 05: Almanac About Tournament Endpoint

## Status

- [ ] Blocked by Tickets 01-04

## Objective

Expose the first About Tournament historical summary endpoint by composing the accepted public
services of Editions, Teams, Participations, Players, Squads, and Matches.

## Dependencies

- Ticket 01: Players Domain.
- Ticket 02: Participations Domain.
- Ticket 03: Squads Domain.
- Ticket 04: Matches Domain.

## Endpoint

```text
GET /api/almanac/about
```

Initial response capabilities:

- all-time champions with title counts and title years;
- years since each champion's latest title, measured against the latest available edition;
- top World Cup scorers with goal totals and represented national teams.

The endpoint returns historical facts. It does not persist page layout, chart widths, labels, or
other frontend presentation decisions.

## Files And Systems Affected

- `src/products/almanac/domains/about/routes.ts`
- `src/products/almanac/domains/about/service.ts`
- `src/products/almanac/router.ts`
- Public service methods in existing owner domains only when a required read is not yet exposed.
- Focused About service and HTTP tests.
- API/slice documentation for the accepted response contract.

## Implementation Checklist

- [ ] Lock the exact JSON contract before implementation.
- [ ] Create an About service with no repository or schema.
- [ ] Compose only public owner-domain services.
- [ ] Derive the latest available edition year from Editions data.
- [ ] Derive champions and title droughts from Participations data.
- [ ] Derive top scorers from Matches, Squads, Players, and Teams domain results.
- [ ] Represent every national team associated with a player's credited World Cup goals.
- [ ] Add `about/routes.ts` and mount it from the Almanac product router.
- [ ] Return an explicit not-found or empty-data outcome when historical data is unavailable.
- [ ] Add deterministic service tests for champions, droughts, scorer ordering, ties, and own goals.
- [ ] Add an HTTP contract test for `GET /api/almanac/about`.

## Acceptance Criteria

- [ ] The endpoint returns `200` with champions, title droughts, and the top three scorers.
- [ ] Brazil has five titles in representative verification data.
- [ ] Germany has four titles in representative verification data.
- [ ] Miroslav Klose leads the representative scorer result with 16 goals.
- [ ] The About service imports no repository, schema, Drizzle API, database client, or Express type.
- [ ] No About table or migration exists.
- [ ] Existing endpoint contracts remain unchanged.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

Also call the local endpoint and inspect the complete JSON response after the automated checks pass.

## Explicitly Excluded

- Persisted historical claims or evidence/source tables.
- Cached aggregate tables or materialized views.
- Additional About Tournament facts beyond the three accepted initial capabilities.
- Frontend implementation.
- Cloudflare deployment changes.
