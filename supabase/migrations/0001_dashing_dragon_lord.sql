DROP TABLE "league_role";--> statement-breakpoint
DROP TABLE "league";--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "provider" text NOT NULL;