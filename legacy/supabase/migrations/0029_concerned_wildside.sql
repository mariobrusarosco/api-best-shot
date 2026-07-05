-- Hardening: Data Cleanup
-- 1. Populate ID if missing (Critical for PK switch)
UPDATE "league_tournament" SET "id" = gen_random_uuid() WHERE "id" IS NULL;

-- 2. Map Status
UPDATE "league_tournament" SET "status" = 'active' WHERE "status" = 'tracked';
UPDATE "league_tournament" SET "status" = 'active' WHERE "status" IS NULL;
UPDATE "league_tournament" SET "status" = 'active' WHERE "status" NOT IN ('active', 'completed', 'upcoming');

-- 3. Cleanup Orphans
DELETE FROM "league_tournament" WHERE "league_id" NOT IN (SELECT "id" FROM "public"."league");
DELETE FROM "league_tournament" WHERE "tournament_id" NOT IN (SELECT "id" FROM "public"."tournament");

-- 4. Deduplicate
DELETE FROM "league_tournament" a USING "league_tournament" b WHERE a.id < b.id AND a.league_id = b.league_id AND a.tournament_id = b.tournament_id;

--> statement-breakpoint
DROP INDEX IF EXISTS "unique_tournament";--> statement-breakpoint
ALTER TABLE "league_tournament" DROP CONSTRAINT "league_tournament_league_id_tournament_id_pk";--> statement-breakpoint
ALTER TABLE "league_tournament" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "league_tournament" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "league_tournament" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "league_tournament" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_tournament" ADD CONSTRAINT "league_tournament_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_tournament" ADD CONSTRAINT "league_tournament_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_league_tournament" ON "league_tournament" USING btree ("league_id","tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_tournament_league_idx" ON "league_tournament" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_tournament_tournament_idx" ON "league_tournament" USING btree ("tournament_id");