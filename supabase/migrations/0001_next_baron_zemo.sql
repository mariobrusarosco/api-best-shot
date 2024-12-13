CREATE TABLE IF NOT EXISTS "league_tournament" (
	"id" uuid DEFAULT gen_random_uuid(),
	"league_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_tournament_league_id_tournament_id_pk" PRIMARY KEY("league_id","tournament_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tournament" ON "league_tournament" USING btree ("league_id","tournament_id");