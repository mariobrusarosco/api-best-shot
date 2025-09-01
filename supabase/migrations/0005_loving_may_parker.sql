ALTER TYPE "dp_job_type" ADD VALUE 'daily_update';--> statement-breakpoint
ALTER TABLE "data_provider_jobs" ALTER COLUMN "tournament_id" DROP NOT NULL;