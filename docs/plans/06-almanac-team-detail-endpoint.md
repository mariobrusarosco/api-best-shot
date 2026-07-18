# Ticket 06: Almanac Team Detail Endpoint

## Status

- [ ] Ready for implementation

## Objective

Add a team-detail endpoint equivalent in responsibility to the existing edition-detail endpoint.
It resolves a national team by code and returns its identity, visual identity, Almanac page number,
and previous/next team navigation.

## Endpoint

```text
GET /api/almanac/teams/:code
```

Examples:

```text
GET /api/almanac/teams/BRA
GET /api/almanac/teams/ARG
```

Team-code input is case-insensitive. The route validates exactly three ASCII letters and the
service normalizes the value to the stored uppercase code. Generated frontend paths remain
lowercase, matching the existing Teams index contract:

```text
/teams/bra
/teams/arg
```

## Existing Behavior To Preserve

```text
GET /api/almanac/teams
```

The existing Teams index response, alphabetical ordering, page-number derivation, paths, and flag
URLs must remain unchanged.

## Data Ownership

The Teams domain continues to own `almanac.national_teams` and adds a one-to-zero-or-one visual
identity relationship:

```text
national_teams 1 -> 0..1 national_team_visual_identities
```

Proposed `almanac.national_team_visual_identities` columns:

| Column | Purpose |
| --- | --- |
| `team_id` | Primary key and foreign key to `national_teams.id` |
| `badge_asset_key` | Nullable provider-neutral badge asset key |
| `accent_color` | Required team accent color |
| `accent_text_color` | Required text color for the accent |
| `spine_color` | Required Almanac spine color |
| `created_at`, `updated_at` | Audit timestamps |

`pageBackground` and `surfaceColor` from the POC data are not persisted in this ticket. They are
presentation defaults rather than team identity values.

The validated `T-31` and `T-86` duplicate identity follows the canonical team alias already used by
the Teams seed and produces one visual-identity row for the canonical national team.

## Proposed Response Contract

```json
{
  "team": {
    "id": "uuid",
    "code": "BRA",
    "displayName": "Brazil",
    "pageNumber": 21,
    "flagUrl": "https://asset-origin/teams/team-BRA.svg",
    "visualIdentity": {
      "badgeUrl": "https://asset-origin/teams/team-BRA.svg",
      "accentColor": "#1f7a45",
      "accentTextColor": "#fffdf5",
      "spineColor": "#f0c847"
    },
    "navigation": {
      "previous": {
        "code": "BIH",
        "displayName": "Bosnia and Herzegovina",
        "path": "/teams/bih"
      },
      "next": {
        "code": "BGR",
        "displayName": "Bulgaria",
        "path": "/teams/bgr"
      }
    }
  }
}
```

The example values reflect the current eight-edition baseline. Tests must still derive and assert
the neighbors and page number from the seeded ordering rather than hard-coding them in production.

`visualIdentity` is `null` when no visual-identity row exists. `flagUrl` and `badgeUrl` are nullable
when their asset keys are absent.

## Files And Systems Affected

- `src/products/almanac/domains/teams/schema.ts`
- `src/products/almanac/domains/teams/repository.ts`
- `src/products/almanac/domains/teams/service.ts`
- `src/products/almanac/domains/teams/routes.ts`
- One new Teams-domain Drizzle migration and its metadata.
- `scripts/seed-almanac/national-team-visual-identities.ts`
- `scripts/seed-almanac.ts`
- `docs/almanac-schema.md`
- Focused Teams service and HTTP tests.

## Implementation Checklist

- [ ] Add the team visual-identity schema to the Teams domain.
- [ ] Generate exactly one Teams migration.
- [ ] Add an idempotent seed from `team_visual_identities.json`.
- [ ] Convert POC badge paths into provider-neutral asset keys at the seed boundary.
- [ ] Canonicalize source-team aliases consistently with the existing national-team seed.
- [ ] Add a repository read for one team and its optional visual identity by normalized code.
- [ ] Add a repository read for the established alphabetical navigation order.
- [ ] Add `getTeamDetail(code)` to the Teams service.
- [ ] Derive the team page number from the existing Teams index ordering.
- [ ] Derive previous and next navigation without storing paths or page numbers.
- [ ] Construct public flag and badge URLs in the service with the platform asset helper.
- [ ] Add `GET /:code` after the existing Teams index route.
- [ ] Return `400` for a malformed code and `404` for a well-formed unknown code.
- [ ] Add focused tests for `BRA`, `ARG`, lowercase input, malformed input, missing teams,
  navigation boundaries, and missing visual identity.
- [ ] Document the implemented table and derived values in `docs/almanac-schema.md`.

## Acceptance Criteria

- [ ] `GET /api/almanac/teams/BRA` returns Brazil with `200`.
- [ ] `GET /api/almanac/teams/ARG` returns Argentina with `200`.
- [ ] Lowercase team codes resolve to the same records.
- [ ] Page numbers match the existing Teams index response.
- [ ] Previous and next teams follow the existing alphabetical order.
- [ ] The first team's `previous` value and the last team's `next` value are `null`.
- [ ] Visual asset URLs use `ASSET_BASE_URL`; raw POC paths are never returned.
- [ ] Running the Almanac seed twice does not duplicate team visual identities.
- [ ] `GET /api/almanac/teams` remains behaviorally unchanged.

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

After automated checks pass, inspect these local responses:

```text
http://localhost:3000/api/almanac/teams/BRA
http://localhost:3000/api/almanac/teams/ARG
```

## Explicitly Excluded

- Edition-specific team colors or button-football appearance.
- Tournament participations, title history, squads, players, matches, and goals.
- Team statistics or evolution calculations.
- Frontend implementation.
- Cloudflare deployment changes.
