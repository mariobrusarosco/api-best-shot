ALTER TABLE "guess" RENAME COLUMN "round_id" TO "round_slug";--> statement-breakpoint
ALTER TABLE "guess" DROP CONSTRAINT "guess_match_id_member_id_pk";--> statement-breakpoint
ALTER TABLE "guess" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "guess" ALTER COLUMN "home_score" SET DATA TYPE integer USING home_score::integer;--> statement-breakpoint
ALTER TABLE "guess" ALTER COLUMN "away_score" SET DATA TYPE integer USING away_score::integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guess" ADD CONSTRAINT "guess_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guess" ADD CONSTRAINT "guess_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guess_member_idx" ON "guess" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guess_match_idx" ON "guess" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guess_active_idx" ON "guess" USING btree ("active");