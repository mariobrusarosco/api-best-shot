-- Hardening: Cleanup orphans and nulls
DELETE FROM "league" WHERE "founder_id" NOT IN (SELECT "id" FROM "public"."member");--> statement-breakpoint
UPDATE "league" SET "label" = 'Untitled League ' || "id" WHERE "label" IS NULL;--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "league" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league" ADD CONSTRAINT "league_founder_id_member_id_fk" FOREIGN KEY ("founder_id") REFERENCES "public"."member"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_founder_idx" ON "league" USING btree ("founder_id");