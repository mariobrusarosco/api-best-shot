ALTER TABLE "tournament_member" RENAME TO "tournament_scoreboard";--> statement-breakpoint
ALTER TABLE "tournament_scoreboard" DROP CONSTRAINT "tournament_member_tournament_id_tournament_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament_scoreboard" DROP CONSTRAINT "tournament_member_member_id_member_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "unique_member_tournament";--> statement-breakpoint
DROP INDEX IF EXISTS "tournament_member_tournament_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tournament_member_member_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_scoreboard" ADD CONSTRAINT "tournament_scoreboard_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_scoreboard" ADD CONSTRAINT "tournament_scoreboard_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_member_tournament_scoreboard" ON "tournament_scoreboard" USING btree ("member_id","tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_scoreboard_tournament_idx" ON "tournament_scoreboard" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_scoreboard_member_idx" ON "tournament_scoreboard" USING btree ("member_id");