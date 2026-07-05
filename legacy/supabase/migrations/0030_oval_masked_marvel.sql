ALTER TABLE "match" ALTER COLUMN "home_score" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "home_penalties_score" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "away_score" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "away_penalties_score" SET DATA TYPE integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match" ADD CONSTRAINT "match_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
