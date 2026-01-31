ALTER TABLE "tournament_round" DROP CONSTRAINT "tournament_round_tournament_id_slug_pk";--> statement-breakpoint
ALTER TABLE "tournament_round" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "tournament_round" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_round_tournament_slug_idx" ON "tournament_round" USING btree ("tournament_id","slug");