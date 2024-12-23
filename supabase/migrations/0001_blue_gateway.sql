CREATE TABLE IF NOT EXISTS "tournament_round" (
	"id" uuid DEFAULT gen_random_uuid(),
	"tournament_id" text NOT NULL,
	"round" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_round_tournament_id_round_pk" PRIMARY KEY("tournament_id","round")
);
--> statement-breakpoint
ALTER TABLE "tournament" ALTER COLUMN "logo" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "tournament" ALTER COLUMN "logo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN IF EXISTS "rounds";