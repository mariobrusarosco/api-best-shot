-- DATA MIGRATION: Backfill NULL team_id by matching team_external_id
UPDATE tournament_standings ts
SET team_id = t.id
FROM team t
WHERE ts.team_id IS NULL
  AND t.external_id = ts.team_external_id
  AND t.provider = ts.provider;--> statement-breakpoint

-- SCHEMA CHANGE: Now safe to add NOT NULL constraint
ALTER TABLE "tournament_standings" ALTER COLUMN "team_id" SET NOT NULL;