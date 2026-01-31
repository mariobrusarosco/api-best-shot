ALTER TABLE "data_provider_executions" ALTER COLUMN "tournament_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "data_provider_executions" ADD COLUMN "match_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_provider_executions" ADD CONSTRAINT "data_provider_executions_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_provider_executions" ADD CONSTRAINT "data_provider_executions_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
