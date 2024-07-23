ALTER TABLE "match" DROP CONSTRAINT "match_tournament_id_round_id_pk";--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_external_id_pk" PRIMARY KEY("external_id");