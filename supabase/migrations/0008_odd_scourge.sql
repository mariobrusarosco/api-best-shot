ALTER TABLE "tournament_round" DROP CONSTRAINT "tournament_round_tournament_id_order_pk";--> statement-breakpoint
ALTER TABLE "tournament_round" ADD CONSTRAINT "tournament_round_tournament_id_slug_pk" PRIMARY KEY("tournament_id","slug");