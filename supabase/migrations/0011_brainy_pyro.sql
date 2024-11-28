ALTER TABLE "member" ADD COLUMN "public_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_public_id_unique" UNIQUE("public_id");