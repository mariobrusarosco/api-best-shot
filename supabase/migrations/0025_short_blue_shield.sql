ALTER TABLE "match" DROP CONSTRAINT "match_external_id_provider_pk";--> statement-breakpoint
ALTER TABLE "match" ADD PRIMARY KEY ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_match" ON "match" USING btree ("external_id","provider");