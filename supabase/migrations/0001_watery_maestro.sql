CREATE TABLE IF NOT EXISTS "league_performance" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"points" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_performance_member_id_league_id_pk" PRIMARY KEY("member_id","league_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_performance" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"points" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_performance_member_id_league_id_pk" PRIMARY KEY("member_id","league_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_league_perfomance" ON "league_performance" USING btree ("member_id","league_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tournament_perfomance" ON "tournament_performance" USING btree ("member_id","league_id");