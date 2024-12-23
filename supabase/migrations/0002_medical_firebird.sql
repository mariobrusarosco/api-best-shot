ALTER TABLE "tournament_round" RENAME COLUMN "round" TO "order";--> statement-breakpoint
ALTER TABLE "tournament_round" DROP CONSTRAINT "tournament_round_tournament_id_round_pk";--> statement-breakpoint
ALTER TABLE "tournament_round" ADD CONSTRAINT "tournament_round_tournament_id_order_pk" PRIMARY KEY("tournament_id","order");