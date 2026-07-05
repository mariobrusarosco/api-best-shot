-- Hardening: Data Cleanup (Map Roles, Delete Orphans, Deduplicate)
-- 1. Map Legacy Roles
UPDATE "league_role" SET "role" = 'admin' WHERE "role" = 'owner';
UPDATE "league_role" SET "role" = 'admin' WHERE "role" = 'super-admin';
UPDATE "league_role" SET "role" = 'member' WHERE "role" NOT IN ('admin', 'member', 'viewer');

-- 2. Cleanup Orphans
DELETE FROM "league_role" WHERE "league_id" NOT IN (SELECT "id" FROM "public"."league");
DELETE FROM "league_role" WHERE "member_id" NOT IN (SELECT "id" FROM "public"."member");

-- 3. Deduplicate (Keep latest by ID, assuming higher ID is newer, or arbitrary)
DELETE FROM "league_role" a USING "league_role" b WHERE a.id < b.id AND a.league_id = b.league_id AND a.member_id = b.member_id;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_role" ADD CONSTRAINT "league_role_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_role" ADD CONSTRAINT "league_role_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "league_role_league_member_idx" ON "league_role" USING btree ("league_id","member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_role_league_idx" ON "league_role" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_role_member_idx" ON "league_role" USING btree ("member_id");