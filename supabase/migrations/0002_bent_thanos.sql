CREATE TABLE IF NOT EXISTS "data_provider_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"report_file_url" text,
	"report_file_key" text,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_reports_tournament_id_idx" ON "data_provider_reports" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_reports_operation_type_idx" ON "data_provider_reports" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_reports_status_idx" ON "data_provider_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_reports_started_at_idx" ON "data_provider_reports" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_provider_reports_request_id_idx" ON "data_provider_reports" USING btree ("request_id");