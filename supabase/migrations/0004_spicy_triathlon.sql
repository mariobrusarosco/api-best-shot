ALTER TABLE "tournament_performance" RENAME COLUMN "tournamentId_id" TO "tournament_id";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_tournament_perfomance";--> statement-breakpoint
ALTER TABLE "tournament_performance" DROP CONSTRAINT "tournament_performance_member_id_tournamentId_id_pk";--> statement-breakpoint
ALTER TABLE "tournament_performance" ADD CONSTRAINT "tournament_performance_member_id_tournament_id_pk" PRIMARY KEY("member_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tournament_perfomance" ON "tournament_performance" USING btree ("member_id","tournament_id");