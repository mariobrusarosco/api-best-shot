ALTER TABLE "match" ALTER COLUMN "round_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "match" ALTER COLUMN "round_id" SET NOT NULL;