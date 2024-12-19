CREATE TABLE IF NOT EXISTS "tournament_standings" (
	"id" uuid DEFAULT gen_random_uuid(),
	"team_external_id" text NOT NULL,
	"tournament_id" text  NOT NULL,
	"order" text NOT NULL,
	"shortame" text NOT NULL,
	"longame" text NOT NULL,
	"points" text NOT NULL,
	"games" text NOT NULL,
	"wins" text NOT NULL,
	"draws" text NOT NULL,
	"losses" text NOT NULL,
	"gf" text NOT NULL,
	"ga" text NOT NULL,
	"gd" text NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_team_external_id_provider_tournament_id_pk" PRIMARY KEY("team_external_id","provider","tournament_id");
