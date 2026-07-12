# Slice: Almanac Edition Detail Identity

## Status

Local implementation complete. Schema, migration, domain layers, and endpoint behavior are
verified locally. Demo deployment remains pending.

## Purpose

Add the first edition-detail response for the Almanac and give each World Cup edition its own
stored visual identity.

This slice establishes only the edition identity, visual theme, and chronological navigation
required by the current detail screen. Football results and participation data remain separate
future work.

`docs/validated-data/` is evidence that the proposed shape supported the frontend proof of concept.
It is not a seed source and does not define values for the new database.

## Goal

Support this independent screen request:

```text
Edition detail
  -> GET /api/almanac/editions/:year
```

The request must follow the canonical domain flow:

```text
Almanac router
  -> Editions routes.ts
    -> Editions service.ts
      -> Editions repository.ts
        -> PostgreSQL
```

The service maps stored asset keys into public URLs through the existing platform asset helper.

## Accepted Endpoint Contract

```ts
type EditionDetailResponse = {
  edition: {
    id: string;
    year: number;
    name: string;
    pageNumber: number;
    host: {
      displayName: string;
    };
    visualIdentity: {
      logoUrl: string | null;
      trophyUrl: string | null;
      accentColor: string;
      accentTextColor: string;
      spineColor: string;
    } | null;
    navigation: {
      previous: EditionNavigationItem | null;
      next: EditionNavigationItem | null;
    };
  };
};

type EditionNavigationItem = {
  year: number;
  path: string;
  hostDisplayName: string;
};
```

## Accepted Request Behavior

```text
valid year and matching edition
  -> 200 with the edition detail response

valid year and no matching edition
  -> 404

invalid year
  -> 400

matching edition without a visual-identity row
  -> 200 with visualIdentity: null

database failure
  -> 500
```

`previous` means the closest older edition. `next` means the closest newer edition. Either value
is `null` when no edition exists in that direction.

The service derives navigation paths from edition years. It does not persist frontend paths.

The detail `pageNumber` follows the accepted Editions ordering and one-page-per-edition rule from
[Almanac Index Navigation](./almanac-index-navigation.md). PostgreSQL does not store the page
number.

## Accepted Schema

Create this Editions-owned table:

```text
almanac.world_cup_edition_visual_identities
```

| Column | Type | Null | Rules |
| --- | --- | --- | --- |
| `edition_id` | `uuid` | No | Primary key; foreign key to `almanac.world_cup_editions.id`; delete with its edition |
| `logo_asset_key` | `text` | Yes | Provider-neutral edition-logo asset key |
| `trophy_asset_key` | `text` | Yes | Provider-neutral edition-trophy asset key |
| `accent_color` | `text` | No | Edition accent color |
| `accent_text_color` | `text` | No | Text color intended for the accent color |
| `spine_color` | `text` | No | Edition spine color |
| `created_at` | `timestamptz` | No | Defaults to `now()` |
| `updated_at` | `timestamptz` | No | Defaults to `now()` |

Relationship:

```text
world_cup_editions 1 -> 0..1 world_cup_edition_visual_identities
```

An edition may exist before its visual identity is populated. When a visual-identity row exists,
all three color fields are required. Logo and trophy keys remain nullable.

Move `logo_asset_key` out of `almanac.world_cup_editions`. Logo, trophy, and colors collectively
belong to the edition visual identity. Do not retain a compatibility column or duplicate the logo
key across both tables.

Do not add `page_background` or `surface_color` in this slice.

## Data Population Boundary

This slice creates the structure and read path only.

```text
Agent-owned work
  -> schema document
  -> Drizzle schema
  -> migration
  -> repository
  -> service
  -> route
  -> verification

Engineer-owned work
  -> populate visual-identity rows and their actual values
```

The schema, migration, and endpoint implementation do not invent visual-identity values.
Engineer-owned values may be entered directly or loaded through engineer-maintained seed data.

## Decision Register

Status meanings:

```text
Accepted   Explicitly confirmed for this slice
Deferred   Valid work intentionally excluded from this slice
```

| ID | Status | Decision |
| --- | --- | --- |
| E1 | Accepted | Expose edition detail through `GET /api/almanac/editions/:year`. |
| E2 | Accepted | Return edition identity, host display name, derived page number, visual identity, and chronological navigation in one screen-oriented response. |
| E3 | Accepted | Store edition visual identity in a one-to-zero-or-one table owned by the Editions domain. |
| E4 | Accepted | Store `logo_asset_key`, `trophy_asset_key`, `accent_color`, `accent_text_color`, and `spine_color` in the visual-identity table. |
| E5 | Accepted | Move the existing edition logo key out of `world_cup_editions`; do not retain duplicate or compatibility storage. |
| E6 | Accepted | Keep logo and trophy keys nullable; require all three colors when a visual-identity row exists. |
| E7 | Accepted | Return `visualIdentity: null` when the edition exists but its visual identity has not been populated. |
| E8 | Accepted | Derive complete logo and trophy URLs in the Editions service through the existing public-asset helper. |
| E9 | Accepted | Derive previous and next editions chronologically and build their paths from their years. |
| E10 | Accepted | Derive the edition page number through the existing Editions ordering rule; do not persist it. |
| E11 | Accepted | Leave actual visual-identity values to the engineer. The schema, migration, and endpoint implementation do not invent them. |
| E12 | Deferred | Winner, final match, penalty shootout, participants, squads, and players belong to later slices. |
| E13 | Deferred | Page background and surface colors are not stored in this slice. |

## Scope

This slice may change:

```text
docs/almanac-schema.md
src/products/almanac/domains/editions/schema.ts
src/products/almanac/domains/editions/repository.ts
src/products/almanac/domains/editions/service.ts
src/products/almanac/domains/editions/routes.ts
engineer-maintained Almanac seed data as required to use the accepted schema
generated Drizzle migration files and metadata
```

## Non-Goals

Do not add during this slice:

```text
agent-authored color or asset-key values;
winner or runner-up data;
matches, scores, goals, or penalty shootouts;
edition-team participation;
squads or players;
page-background or surface-color columns;
frontend changes;
new asset infrastructure or URL mechanics;
backward-compatible database columns or API aliases.
```

## Checklist

### 1. Record The Accepted Schema

- [x] Add `almanac.world_cup_edition_visual_identities` to `docs/almanac-schema.md`.
- [x] Remove `logo_asset_key` from the documented `world_cup_editions` table.
- [x] Record the one-to-zero-or-one relationship and nullability rules.
- [x] Confirm the accepted schema document and this slice agree before editing Drizzle.

### 2. Implement The Database Change

- [x] Add the visual-identity table to the Editions Drizzle schema.
- [x] Remove `logo_asset_key` from the Editions table declaration.
- [x] Generate a descriptive migration.
- [x] Review the generated SQL for the table, foreign key, delete behavior, and removed column.
- [x] Keep the generated migration free of hard-coded visual-identity values and data backfill.
- [x] Preserve engineer-owned seed data while adapting it to the accepted schema.

### 3. Implement The Repository

- [x] Read one edition and its optional visual identity by year.
- [x] Read the information required to derive its page number.
- [x] Read the closest older and newer editions for navigation.
- [x] Keep persistence records separate from the public API response.

### 4. Implement The Service

- [x] Validate the domain year input after the route parses the HTTP parameter.
- [x] Map the repository result into the accepted edition-detail contract.
- [x] Derive the page number through the accepted Editions ordering rule.
- [x] Derive previous and next navigation paths from edition years.
- [x] Build complete logo and trophy URLs through `buildPublicAssetUrl`.
- [x] Preserve `visualIdentity: null` when no visual-identity row exists.

### 5. Implement The Route

- [x] Add `GET /api/almanac/editions/:year` to the Editions router.
- [x] Return `400` for an invalid year.
- [x] Return `404` when the edition does not exist.
- [x] Return `200` with the accepted response when the edition exists.
- [x] Preserve the existing Editions index route.

### 6. Verify Locally

- [x] Run `pnpm db:check`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Apply the migration locally.
- [x] Verify an invalid year returns `400`.
- [x] Verify an unknown valid year returns `404`.
- [x] Verify an existing edition without visual data returns `200` and `visualIdentity: null`.
- [x] After the engineer populates a visual-identity row, verify the endpoint returns its theme and public asset URLs.
- [x] Verify previous and next navigation at the beginning, middle, and end of the available chronology.
- [x] Record the local result in this document.

### 7. Verify Demo

- [ ] Deploy through the accepted manual demo workflow with `seed: false`.
- [ ] Verify the migration is applied before the dependent application deployment.
- [ ] Verify the deployed detail endpoint against engineer-populated demo data.
- [ ] Record the deployed result.

## Done Criteria

The slice is complete when:

- [x] the canonical schema document, Drizzle declaration, and generated migration agree;
- [x] the old edition logo column is not retained;
- [x] the detail endpoint returns the accepted contract and status codes;
- [x] missing visual identity is represented as `null`;
- [x] asset URLs, paths, page number, and navigation are derived outside PostgreSQL;
- [x] the schema, migration, and endpoint implementation do not invent visual-identity values;
- [ ] local and demo verification are recorded;
- [x] no winner, match, squad, player, or unrelated visual fields are introduced.

## Local Proof: 2026-07-12

Migration `0005_almanac_edition_visual_identity` created the accepted visual-identity table,
created its cascading foreign key, and removed `world_cup_editions.logo_asset_key`. PostgreSQL's
migration ledger contains all six migrations. Information-schema queries confirmed every accepted
column, nullability rule, and `ON DELETE CASCADE` behavior.

These checks passed:

```text
pnpm db:check
pnpm typecheck
pnpm build
```

Within the Codex command runner, the `drizzle-kit migrate` terminal renderer exited at its spinner
without sending SQL or reporting a PostgreSQL error. The same generated migration was applied
through Drizzle's official PostgreSQL migrator, after which the ledger and resulting schema were
verified directly. The normal `pnpm db:migrate` command remains the accepted engineer and CI
workflow and must be exercised again during demo deployment.

Live local requests proved:

```text
invalid year
  -> 400

unknown valid year
  -> 404

existing edition before visual data was populated
  -> 200 with visualIdentity: null

existing edition after engineer-owned visual data was populated
  -> 200 with the complete visual identity

oldest edition
  -> previous: null

middle edition
  -> both previous and next present

newest edition
  -> next: null

GET /api/almanac/editions
  -> existing index contract remains available
```

## Next Step

Populate or refine the intended local values as needed, then deploy through the accepted manual
demo workflow with `seed: false` and complete checklist section 7.
