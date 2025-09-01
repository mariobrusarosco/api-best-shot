DO $$ BEGIN
 CREATE TYPE "public"."dp_execution_status" AS ENUM('not_triggered', 'triggered', 'executing', 'execution_succeeded', 'execution_failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dp_job_type" AS ENUM('standings_and_scores', 'new_knockout_rounds');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dp_schedule_status" AS ENUM('pending', 'scheduled', 'schedule_failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_provider_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" text NOT NULL,
	"schedule_arn" text,
	"job_type" "dp_job_type" NOT NULL,
	"duration_days" integer NOT NULL,
	"cron_expression" text,
	"target_lambda_arn" text NOT NULL,
	"target_endpoint" text NOT NULL,
	"target_payload" jsonb,
	"tournament_id" uuid NOT NULL,
	"schedule_status" "dp_schedule_status" DEFAULT 'pending' NOT NULL,
	"execution_status" "dp_execution_status" DEFAULT 'not_triggered' NOT NULL,
	"scheduled_at" timestamp,
	"schedule_confirmed_at" timestamp,
	"schedule_failed_at" timestamp,
	"schedule_error_details" jsonb,
	"triggered_at" timestamp,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"execution_id" text,
	"execution_result" jsonb,
	"execution_error_details" jsonb,
	"environment" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_provider_jobs_schedule_id_unique" UNIQUE("schedule_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_provider_jobs" ADD CONSTRAINT "data_provider_jobs_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_schedule_id_idx" ON "data_provider_jobs" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_tournament_id_idx" ON "data_provider_jobs" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_job_type_idx" ON "data_provider_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_schedule_status_idx" ON "data_provider_jobs" USING btree ("schedule_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_execution_status_idx" ON "data_provider_jobs" USING btree ("execution_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_environment_idx" ON "data_provider_jobs" USING btree ("environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_jobs_created_at_idx" ON "data_provider_jobs" USING btree ("created_at");