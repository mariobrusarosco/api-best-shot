CREATE TABLE IF NOT EXISTS "scoreboard_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"guess_id" uuid NOT NULL,
	"points_earned" integer NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scoreboard_ledger" ADD CONSTRAINT "scoreboard_ledger_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scoreboard_ledger" ADD CONSTRAINT "scoreboard_ledger_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scoreboard_ledger" ADD CONSTRAINT "scoreboard_ledger_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scoreboard_ledger" ADD CONSTRAINT "scoreboard_ledger_guess_id_guess_id_fk" FOREIGN KEY ("guess_id") REFERENCES "public"."guess"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scoreboard_ledger_match_member_rule_version_idx" ON "scoreboard_ledger" USING btree ("match_id","member_id","rule_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_ledger_tournament_idx" ON "scoreboard_ledger" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_ledger_member_idx" ON "scoreboard_ledger" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_ledger_match_idx" ON "scoreboard_ledger" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_ledger_guess_idx" ON "scoreboard_ledger" USING btree ("guess_id");