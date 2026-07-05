CREATE TABLE IF NOT EXISTS "cron_job_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"target" text NOT NULL,
	"payload" jsonb,
	"schedule_type" text NOT NULL,
	"cron_expression" text,
	"run_at" timestamp,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pause_reason" text,
	"supersedes_job_id" uuid,
	"created_by" text DEFAULT 'system' NOT NULL,
	"updated_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cron_job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_definition_id" uuid NOT NULL,
	"job_key" text NOT NULL,
	"job_version" integer NOT NULL,
	"target" text NOT NULL,
	"payload_snapshot" jsonb,
	"trigger_type" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"failure_details" jsonb,
	"runner_instance_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cron_job_runs" ADD CONSTRAINT "cron_job_runs_job_definition_id_cron_job_definitions_id_fk" FOREIGN KEY ("job_definition_id") REFERENCES "public"."cron_job_definitions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_definitions_job_key_version_idx" ON "cron_job_definitions" USING btree ("job_key","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_definitions_status_idx" ON "cron_job_definitions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_definitions_target_idx" ON "cron_job_definitions" USING btree ("target");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_definitions_schedule_type_idx" ON "cron_job_definitions" USING btree ("schedule_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_status_scheduled_at_idx" ON "cron_job_runs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_job_definition_id_idx" ON "cron_job_runs" USING btree ("job_definition_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_job_key_job_version_idx" ON "cron_job_runs" USING btree ("job_key","job_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_target_idx" ON "cron_job_runs" USING btree ("target");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_created_at_idx" ON "cron_job_runs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_runs_scheduled_slot_unique_idx" ON "cron_job_runs" USING btree ("job_definition_id","scheduled_at","trigger_type");