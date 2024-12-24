ALTER TABLE "tournament" ALTER COLUMN "round_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournament_round" ADD COLUMN "type" text NOT NULL;