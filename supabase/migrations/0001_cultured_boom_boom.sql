ALTER TABLE "tournament" DROP CONSTRAINT "tournament_provider_external_id_pk";--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_id_pk" PRIMARY KEY("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_provider_external_id" ON "tournament" USING btree ("provider","external_id");