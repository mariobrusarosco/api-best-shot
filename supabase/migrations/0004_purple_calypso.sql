DROP INDEX IF EXISTS "unique_provider_external_id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_external_id_slug" ON "tournament" USING btree ("external_id","slug");