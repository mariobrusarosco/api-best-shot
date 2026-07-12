# Backend Contract Notes

## Purpose

Capture frontend-facing backend expectations for the Button Football POC before the real backend exists.

This document is a working contract notebook. It should start broad, then become more precise as decisions are locked.

## Current Frontend Assumptions

These assumptions describe what the POC frontend currently needs from the frontend-facing API. They are not locked backend contracts yet.

Field names, endpoint names, and response shapes can still change. The important thing to preserve is the product meaning and the responsibility split between frontend and backend.

### Endpoint Responses Are Screen-Oriented

The frontend is currently written against endpoint-shaped responses, not raw database tables.

That means the frontend expects the API to return data that is already assembled for the screen it is rendering. The frontend should not need to reproduce backend joins across tournaments, teams, squads, visual identities, goals, appearances, and final placement tables.

Current frontend-facing endpoints:

- `GET /api/editions`
- `GET /api/world-cups/:year`
- `GET /api/squads`
- `GET /api/teams/:teamCode`
- `GET /api/world-cups/:year/teams/:teamCode`

These route names are provisional. The backend can rename them later if we agree on a better API language.

### Index Screens Need Lightweight Rows

Index screens currently fetch lightweight list rows.

For editions, the frontend needs enough data to render the editions list:

- tournament identifier
- year
- host display name
- edition logo URL

For squads, the frontend needs enough data to render the national squads list:

- team identifier
- team code
- team display name
- badge or flag URL
- all-time World Cup appearance count

The index screens do not need complete detail payloads.

### Detail Screens Need Joined Payloads

Detail screens currently expect joined data.

For a World Cup edition detail page, the frontend needs the edition facts, tournament visual identity, previous/next edition navigation, winner summary, and final match summary in one response.

For a team all-time page, the frontend needs team identity, previous/next team navigation, stable visual identity, and all-time stats in one response.

For a team-in-edition page, the frontend needs the selected tournament, selected team, tournament options, national squad options, team appearance colors, finish data, players, player appearances, and player stats in one response.

This is not a final API shape. It records that the backend should protect the frontend from doing broad cross-table assembly.

### Visual Identity Is Data

The frontend assumes visual identity is data returned by the API or derived from data returned by the API.

Visual identity includes:

- badge or flag asset URLs
- tournament logo and trophy asset URLs
- team button colors
- page accent colors
- accent text colors
- page/spine/surface colors where needed

The frontend should not recreate badge paths from CSS tricks or hard-coded country logic.

### Almanac Page Numbers Are Frontend Presentation Metadata

Almanac page numbers are currently not backend data.

The frontend derives page numbers from the local almanac page index:

- table of contents pages
- editions section page
- edition detail pages
- squads section page
- squad detail pages

The backend can expose page metadata in the future if the almanac becomes backend-driven, but the current POC treats page numbering as frontend presentation metadata.

### Missing Assets Are Allowed During The POC

Some asset URLs may point to files that have not been added yet.

The API can still return the intended absolute asset URL. The frontend may visually show a broken
image until the object is added. This is acceptable while we are populating the visual asset set.

### Errors Are Simple For Now

The frontend currently handles missing detail resources as simple failed requests.

For missing teams or editions, the API should return `404` with a small JSON message. We have not designed a full backend error envelope yet.

## Database Design

The backend should use a relational model as the source of truth.

API responses should be projections assembled from this model. The frontend should not care whether a field comes directly from one table, from a join, or from a backend-calculated aggregate.

The schema below uses PostgreSQL types. If the backend uses an ORM, the same PK, FK, uniqueness, and check constraints should still exist in migrations.

### Database Conventions

- Use internal `uuid` primary keys for real database identity.
- Preserve imported JSON/source IDs in `source_key text UNIQUE NOT NULL`.
- Do not use display names as identifiers.
- Use `date` for historical match and tournament dates.
- Use `smallint` for years, shirt numbers, scores, and counts that are naturally small.
- Use `integer` for aggregate stats that can grow over time.
- Store visual paint values as plain strings. They may be hex colors, named colors, `rgb(...)`, `hsl(...)`, `linear-gradient(...)`, `radial-gradient(...)`, or future CSS-compatible tokens.
- Store provider-neutral asset object keys as strings, without a leading slash or delivery hostname.
  API services turn those keys into absolute URLs. If asset metadata becomes important, introduce
  an `assets` table later.
- Use `ON DELETE RESTRICT` for historical football data. Accidental parent deletion should fail loudly.

### Shared Types

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Core Tournament Schema

```sql
CREATE TABLE world_cups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  year smallint NOT NULL UNIQUE CHECK (year BETWEEN 1930 AND 2100),
  name text NOT NULL,
  host_display_name text NOT NULL,
  start_date date,
  end_date date,
  team_count smallint NOT NULL CHECK (team_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  code varchar(3) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{3}$'),
  name text NOT NULL,
  confederation_code text,
  confederation_name text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE world_cup_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  world_cup_id uuid NOT NULL REFERENCES world_cups(id) ON DELETE RESTRICT,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  final_position smallint CHECK (final_position > 0),
  official_final_position smallint CHECK (official_final_position > 0),
  final_position_source text CHECK (
    final_position_source IN ('official_raw', 'computed', 'manual')
  ),
  final_stage text,
  matches_played smallint NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  wins smallint NOT NULL DEFAULT 0 CHECK (wins >= 0),
  draws smallint NOT NULL DEFAULT 0 CHECK (draws >= 0),
  losses smallint NOT NULL DEFAULT 0 CHECK (losses >= 0),
  goals_for smallint NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against smallint NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  goal_difference smallint GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_cup_id, team_id),
  UNIQUE (world_cup_id, final_position),
  CHECK (matches_played = wins + draws + losses)
);

CREATE INDEX world_cup_teams_world_cup_id_idx ON world_cup_teams(world_cup_id);
CREATE INDEX world_cup_teams_team_id_idx ON world_cup_teams(team_id);
```

`winner` should not be duplicated on `world_cups`. It can be queried from `world_cup_teams` where `final_position = 1`.

### Match Schema

```sql
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  world_cup_id uuid NOT NULL REFERENCES world_cups(id) ON DELETE RESTRICT,
  stage text NOT NULL,
  group_name text,
  match_date date,
  home_world_cup_team_id uuid NOT NULL REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  away_world_cup_team_id uuid NOT NULL REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  home_score smallint NOT NULL CHECK (home_score >= 0),
  away_score smallint NOT NULL CHECK (away_score >= 0),
  extra_time boolean NOT NULL DEFAULT false,
  penalty_shootout boolean NOT NULL DEFAULT false,
  home_penalty_score smallint CHECK (home_penalty_score >= 0),
  away_penalty_score smallint CHECK (away_penalty_score >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_world_cup_team_id <> away_world_cup_team_id),
  CHECK (
    penalty_shootout
    OR (home_penalty_score IS NULL AND away_penalty_score IS NULL)
  )
);

CREATE INDEX matches_world_cup_id_idx ON matches(world_cup_id);
CREATE INDEX matches_home_world_cup_team_id_idx ON matches(home_world_cup_team_id);
CREATE INDEX matches_away_world_cup_team_id_idx ON matches(away_world_cup_team_id);
```

### Squad And Player Schema

```sql
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  given_name text,
  family_name text NOT NULL,
  display_name text NOT NULL,
  birth_date date,
  wikipedia_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE world_cup_squad_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  world_cup_team_id uuid NOT NULL REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  shirt_number smallint CHECK (shirt_number BETWEEN 1 AND 99),
  position_code varchar(2) NOT NULL CHECK (position_code IN ('GK', 'DF', 'MF', 'FW')),
  position_name text NOT NULL,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_cup_team_id, player_id)
);

CREATE UNIQUE INDEX world_cup_squad_players_number_unique_idx
  ON world_cup_squad_players(world_cup_team_id, shirt_number)
  WHERE shirt_number IS NOT NULL;

CREATE INDEX world_cup_squad_players_world_cup_team_id_idx
  ON world_cup_squad_players(world_cup_team_id);

CREATE INDEX world_cup_squad_players_player_id_idx
  ON world_cup_squad_players(player_id);
```

`world_cup_squad_players` is the real relational shape for the current `world_cup_squads.json` data. The table is one row per selected player, not one row per squad.

### Player Appearance And Goal Schema

```sql
CREATE TABLE player_match_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  world_cup_squad_player_id uuid NOT NULL REFERENCES world_cup_squad_players(id) ON DELETE RESTRICT,
  position_code varchar(2) CHECK (position_code IN ('GK', 'DF', 'MF', 'FW')),
  position_name text,
  started boolean NOT NULL DEFAULT false,
  substitute boolean NOT NULL DEFAULT false,
  goals_scored smallint NOT NULL DEFAULT 0 CHECK (goals_scored >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, world_cup_squad_player_id),
  CHECK (NOT (started AND substitute))
);

CREATE INDEX player_match_appearances_match_id_idx
  ON player_match_appearances(match_id);

CREATE INDEX player_match_appearances_squad_player_id_idx
  ON player_match_appearances(world_cup_squad_player_id);

CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  benefiting_world_cup_team_id uuid NOT NULL REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  credited_world_cup_team_id uuid REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  credited_squad_player_id uuid REFERENCES world_cup_squad_players(id) ON DELETE RESTRICT,
  minute_label text,
  minute_regulation smallint CHECK (minute_regulation BETWEEN 0 AND 130),
  minute_stoppage smallint CHECK (minute_stoppage >= 0),
  match_period text,
  is_own_goal boolean NOT NULL DEFAULT false,
  is_penalty boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX goals_match_id_idx ON goals(match_id);
CREATE INDEX goals_benefiting_world_cup_team_id_idx
  ON goals(benefiting_world_cup_team_id);
CREATE INDEX goals_credited_squad_player_id_idx
  ON goals(credited_squad_player_id);
```

For normal goals, `benefiting_world_cup_team_id` and `credited_world_cup_team_id` should be the same team. For own goals, `benefiting_world_cup_team_id` is the team that receives the goal and `credited_world_cup_team_id` is the player's team.

### Visual Identity Schema

Visual identity is data. It should not be recreated in frontend CSS from country-specific conditionals.

```sql
CREATE TABLE team_visual_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES teams(id) ON DELETE RESTRICT,
  badge_asset_key text,
  accent text NOT NULL,
  accent_text text NOT NULL,
  spine_color text NOT NULL,
  page_background text NOT NULL,
  surface_color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE world_cup_visual_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_cup_id uuid NOT NULL UNIQUE REFERENCES world_cups(id) ON DELETE RESTRICT,
  logo_asset_key text,
  trophy_asset_key text,
  accent text NOT NULL,
  accent_text text NOT NULL,
  spine_color text NOT NULL,
  page_background text NOT NULL,
  surface_color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE world_cup_team_visual_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_cup_team_id uuid NOT NULL UNIQUE REFERENCES world_cup_teams(id) ON DELETE RESTRICT,
  badge_asset_key text,
  button_face text NOT NULL,
  button_face_dark text NOT NULL,
  button_side text NOT NULL,
  button_mark text NOT NULL,
  button_number text NOT NULL,
  goalkeeper_base text NOT NULL,
  goalkeeper_mark text NOT NULL,
  accent text NOT NULL,
  accent_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Team visual identity and World Cup team visual identity are intentionally separate. `team_visual_identities` describes Brazil as a national team across the almanac. `world_cup_team_visual_identities` describes Brazil inside one edition, such as Brazil 1958 or Brazil 2022.

### Derived Values

Some values can be calculated by the backend from the relational model:

- all-time team appearance count
- all-time team goals, wins, draws, and losses
- title years
- top scorer
- most assists, if assist data exists
- previous and next edition navigation
- previous and next team navigation

If a source provides an official value directly, the backend can store it. If the value is derived, the backend can compute it on request or materialize it later for performance.

### Relationship Sketch

- `world_cups` has many `world_cup_teams`
- `teams` has many `world_cup_teams`
- `world_cup_teams` has many `world_cup_squad_players`
- `players` has many `world_cup_squad_players`
- `world_cups` has many `matches`
- `matches` has many `player_match_appearances`
- `matches` has many `goals`
- `world_cup_teams` has one optional `world_cup_team_visual_identities` row
- `teams` has one optional `team_visual_identities` row
- `world_cups` has one optional `world_cup_visual_identities` row

## Backend Responsibilities

The backend is responsible for turning reliable football data into stable product APIs.

The database schema is the source of truth. API responses are read models assembled from that schema for specific frontend screens. The frontend should not need to know the physical table layout or reproduce backend joins.

### Own Schema And Data Integrity

The backend must own database migrations, constraints, and referential integrity.

This includes:

- primary keys and foreign keys
- unique constraints
- check constraints
- required vs optional fields
- source key preservation for imported data
- safe deletion behavior for historical data

The frontend should never compensate for duplicate rows, invalid team codes, invalid tournament years, missing parents, or broken relationships.

### Import And Normalize Source Data

The backend must import raw source data into the relational model.

Raw source shape is not the application model. During import, the backend should:

- map source IDs into `source_key`
- normalize teams, tournaments, players, squads, matches, goals, and appearances
- preserve source-derived values when they are official
- mark whether important values are official, computed, or manually curated
- avoid duplicating display-only data across tables when a relation can express it

The frontend should consume backend API responses, not raw source exports.

### Preserve Data Provenance

Some values are facts from the source data. Other values are computed by us or manually curated.

The backend should preserve that distinction for important fields.

Examples:

- final team placement
- final stage reached
- winner and runner-up summaries
- player position
- squad shirt number
- visual identity overrides

For fields where provenance matters, the backend should store enough metadata to answer: did this come from the source, from our script, or from a manual edit?

### Assemble API Responses

The backend should return endpoint-shaped responses that match product screens.

That means the backend is responsible for joins across:

- tournaments
- teams
- team tournament appearances
- squads
- players
- matches
- goals
- visual identities
- derived stats

The frontend can still sort, filter, and render UI state, but it should not need to reconstruct the domain model from raw tables.

The backend should be free to change table structure without forcing frontend route components to change, as long as the API contract remains stable.

### Compute Or Materialize Derived Values

The backend should calculate derived values from normalized tables.

Examples:

- title years
- all-time team appearances
- all-time wins, draws, losses, and goals
- final placement summaries
- top scorer
- most assists, if assist data exists
- previous and next edition navigation
- previous and next team navigation

These can be computed on request first. If performance becomes a problem, the backend can materialize them later with a documented refresh strategy.

Materialized values must be treated as derived data, not independent truth. If the source tables change, materialized values need a refresh path.

### Serve Visual Identity As Data

The backend should return visual identity values as data.

This includes:

- team badge asset URLs
- tournament logo and trophy asset URLs
- page colors
- accent text colors
- spine colors
- button paint values
- goalkeeper paint values

Paint values are strings. The backend should not restrict them to hex colors, because gradients and CSS-compatible paint tokens are valid visual data for this product.

### Own Asset References, Not Asset Rendering

The backend should return absolute asset URLs such as badge URLs, flag URLs, tournament logos, and
trophy images. PostgreSQL stores only the corresponding provider-neutral object keys.

The backend does not need to render those assets or know how they are positioned inside the UI. It only needs to return stable references and the metadata needed for the frontend to render the correct visual identity.

### Define API Errors And Empty States

The backend should define predictable error behavior.

For now:

- missing resource: `404`
- invalid path parameter: `400`
- unexpected server failure: `500`

The response body can stay simple at first, but it should be consistent enough for the frontend to distinguish missing data from broken requests.

### Keep API Versioning Explicit

The POC currently lives under `/v0` in the frontend.

When the backend contract becomes real, API versioning should be explicit too. The exact route prefix can change, but breaking response-shape changes should not silently replace existing contracts.

### Keep Presentation Metadata Explicit

Some values are product presentation metadata rather than football facts.

Examples:

- almanac page numbers
- section order
- default sort order

These can stay frontend-owned during the POC. If the backend starts serving them later, they should be modeled explicitly instead of mixed into football fact tables.

### Not Backend Responsibilities For Now

The backend does not need to own every part of the almanac experience immediately.

Frontend-owned for now:

- hover state
- selected position query parameter state
- local list sort direction
- layout composition
- button football visual rendering
- almanac page-number calculation

If any of these become shared product rules later, we can move them into backend-provided metadata deliberately.

## Open Questions

To be filled.
