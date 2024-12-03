ALTER TABLE "guess" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "guess" ALTER COLUMN "home_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "guess" ALTER COLUMN "away_score" DROP NOT NULL;