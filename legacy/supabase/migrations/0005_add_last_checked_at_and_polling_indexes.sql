ALTER TABLE "match" ADD COLUMN "last_checked_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_status_idx" ON "match" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_tournament_rounds_idx" ON "match" USING btree ("tournament_id","round_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_polling_idx" ON "match" USING btree ("status","date","last_checked_at");