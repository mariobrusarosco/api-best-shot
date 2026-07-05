ALTER TABLE "match" RENAME COLUMN "home_team_id" TO "external_home_team_id";--> statement-breakpoint
ALTER TABLE "match" RENAME COLUMN "away_team_id" TO "external_away_team_id";--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_id_unique" UNIQUE("id");