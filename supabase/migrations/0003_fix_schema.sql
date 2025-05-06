-- Drop existing constraints and indexes
DROP INDEX IF EXISTS unique_provider_external_id;
DROP INDEX IF EXISTS unique_tournament_perfomance;
DROP INDEX IF EXISTS unique_league_perfomance;
DROP INDEX IF EXISTS unique_tournament;
DROP INDEX IF EXISTS unique_guess;

-- Fix tournament table
ALTER TABLE tournament 
    DROP CONSTRAINT IF EXISTS tournament_id_pk,
    ALTER COLUMN slug DROP NOT NULL,
    ALTER COLUMN standings_mode DROP NOT NULL,
    ALTER COLUMN logo DROP NOT NULL;

-- Recreate proper constraints
ALTER TABLE tournament ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX unique_provider_external_id ON tournament(provider, external_id);

-- Fix tournament_round table
ALTER TABLE tournament_round 
    DROP CONSTRAINT IF EXISTS tournament_round_tournament_id_slug_pk,
    ALTER COLUMN slug DROP NOT NULL;

-- Recreate proper constraints
ALTER TABLE tournament_round ADD PRIMARY KEY (tournament_id, slug);

-- Fix other tables' constraints
ALTER TABLE team DROP CONSTRAINT IF EXISTS team_provider_external_id_pk;
ALTER TABLE team ADD PRIMARY KEY (provider, external_id);

ALTER TABLE guess DROP CONSTRAINT IF EXISTS guess_match_id_member_id_pk;
ALTER TABLE guess ADD PRIMARY KEY (match_id, member_id);

ALTER TABLE tournament_standings DROP CONSTRAINT IF EXISTS tournament_standings_shortame_tournament_id_pk;
ALTER TABLE tournament_standings ADD PRIMARY KEY (shortame, tournament_id);

-- Recreate other unique indexes
CREATE UNIQUE INDEX unique_tournament_performance ON tournament_performance(member_id, tournament_id);
CREATE UNIQUE INDEX unique_league_performance ON league_performance(member_id, league_id);
CREATE UNIQUE INDEX unique_league_tournament ON league_tournament(league_id, tournament_id);
CREATE UNIQUE INDEX unique_guess ON guess(match_id, member_id);

-- Create the unique index on tournament
CREATE UNIQUE INDEX unique_provider_external_id ON tournament(provider, external_id); 