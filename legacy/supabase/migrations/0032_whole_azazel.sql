-- PLUGING OUT - STEP 1
ALTER TABLE "match" DROP CONSTRAINT "match_home_team_id_team_id_fk";--> statement-breakpoint
ALTER TABLE "match" DROP CONSTRAINT "match_away_team_id_team_id_fk";--> statement-breakpoint
ALTER TABLE "tournament_standings" DROP CONSTRAINT "tournament_standings_team_id_team_id_fk";--> statement-breakpoint


-- REDOING THE COMULNS - STEP 2
ALTER TABLE "team" DROP CONSTRAINT "team_id_unique";--> statement-breakpoint
ALTER TABLE "team" DROP CONSTRAINT "team_provider_external_id_pk";--> statement-breakpoint
ALTER TABLE "team" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_unique_idx" ON "team" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_name_idx" ON "team" USING btree ("name");

-- PLUGING IN - STEP 3
ALTER TABLE "match" ADD CONSTRAINT "match_home_team_id_team_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_away_team_id_team_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE no action ON UPDATE no action;