ALTER TABLE "match" DROP CONSTRAINT "match_external_id_pk";--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;