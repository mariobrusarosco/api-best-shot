-- DATA MIGRATION: Backfill NULL home_team_id by matching external IDs
UPDATE match m
SET home_team_id = t.id
FROM team t
WHERE m.home_team_id IS NULL
  AND t.external_id = m.external_home_team_id
  AND t.provider = m.provider;--> statement-breakpoint

-- SAFETY NET: Delete orphaned matches where home team could not be mapped
DELETE FROM match WHERE home_team_id IS NULL;--> statement-breakpoint

-- DATA MIGRATION: Backfill NULL away_team_id by matching external IDs
UPDATE match m
SET away_team_id = t.id
FROM team t
WHERE m.away_team_id IS NULL
  AND t.external_id = m.external_away_team_id
  AND t.provider = m.provider;--> statement-breakpoint

-- SAFETY NET: Delete orphaned matches where away team could not be mapped
DELETE FROM match WHERE away_team_id IS NULL;--> statement-breakpoint

-- SCHEMA CHANGE: Now safe to add NOT NULL constraints
ALTER TABLE "match" ALTER COLUMN "home_team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "away_team_id" SET NOT NULL;