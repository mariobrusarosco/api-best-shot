ALTER TABLE "match" ALTER COLUMN "round_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "home_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "away_score" DROP NOT NULL;