ALTER TABLE "match" ADD COLUMN "home_team_id" uuid;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "away_team_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match" ADD CONSTRAINT "match_home_team_id_team_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match" ADD CONSTRAINT "match_away_team_id_team_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
