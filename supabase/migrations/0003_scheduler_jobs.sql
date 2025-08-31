-- Create enum types for scheduler jobs
DO $$ BEGIN
 CREATE TYPE "public"."schedule_status" AS ENUM('pending', 'scheduled', 'triggered', 'executing', 'completed', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."schedule_type" AS ENUM('scores_and_standings', 'knockouts_update');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create scheduler_jobs table
CREATE TABLE IF NOT EXISTS "scheduler_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" text NOT NULL,
	"schedule_arn" text,
	"schedule_type" "schedule_type" NOT NULL,
	"cron_expression" text,
	"target_lambda_arn" text,
	"target_input" jsonb,
	"tournament_id" uuid NOT NULL,
	"match_id" uuid,
	"match_external_id" text,
	"match_provider" text,
	"round_slug" text,
	"status" "schedule_status" DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"triggered_at" timestamp,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"execution_id" text,
	"execution_status" text,
	"execution_error" jsonb,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"environment" text NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scheduler_jobs_schedule_id_unique" UNIQUE("schedule_id")
);

-- Add foreign key constraint to tournament table
DO $$ BEGIN
 ALTER TABLE "scheduler_jobs" ADD CONSTRAINT "scheduler_jobs_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "scheduler_jobs_schedule_id_idx" ON "scheduler_jobs" USING btree ("schedule_id");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_tournament_id_idx" ON "scheduler_jobs" USING btree ("tournament_id");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_match_id_idx" ON "scheduler_jobs" USING btree ("match_id");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_match_external_id_idx" ON "scheduler_jobs" USING btree ("match_external_id");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_status_idx" ON "scheduler_jobs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_scheduled_at_idx" ON "scheduler_jobs" USING btree ("scheduled_at");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_schedule_type_idx" ON "scheduler_jobs" USING btree ("schedule_type");
CREATE INDEX IF NOT EXISTS "scheduler_jobs_environment_idx" ON "scheduler_jobs" USING btree ("environment");