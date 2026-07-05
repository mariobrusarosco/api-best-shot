CREATE TABLE IF NOT EXISTS "scoreboard_executions" (
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
DO $$ BEGIN
 ALTER TABLE "scoreboard_executions" ADD CONSTRAINT "scoreboard_executions_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_executions_tournament_idx" ON "scoreboard_executions" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_executions_operation_type_idx" ON "scoreboard_executions" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_executions_status_idx" ON "scoreboard_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_executions_started_at_idx" ON "scoreboard_executions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoreboard_executions_request_id_idx" ON "scoreboard_executions" USING btree ("request_id");