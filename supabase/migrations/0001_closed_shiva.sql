ALTER TABLE "tournament" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "season_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_external_id_unique" UNIQUE("external_id");