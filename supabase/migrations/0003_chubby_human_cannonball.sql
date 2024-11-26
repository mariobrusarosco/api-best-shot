ALTER TABLE "tournament" RENAME COLUMN "season_id" TO "season";--> statement-breakpoint
ALTER TABLE "tournament" ALTER COLUMN "external_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "slug" text NOT NULL;