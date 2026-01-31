ALTER TABLE "member" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_public_id_idx" ON "member" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_email_idx" ON "member" USING btree ("email");