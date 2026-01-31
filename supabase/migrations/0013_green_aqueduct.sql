ALTER TABLE "tournament_standings" RENAME COLUMN "shortame" TO "short_name";--> statement-breakpoint
ALTER TABLE "tournament_standings" RENAME COLUMN "longame" TO "long_name";--> statement-breakpoint
ALTER TABLE "tournament_standings" RENAME COLUMN "gf" TO "goals_for";--> statement-breakpoint
ALTER TABLE "tournament_standings" RENAME COLUMN "ga" TO "goals_against";--> statement-breakpoint
ALTER TABLE "tournament_standings" RENAME COLUMN "gd" TO "goal_difference";--> statement-breakpoint
ALTER TABLE "tournament_standings" DROP CONSTRAINT "tournament_standings_shortame_tournament_id_pk";--> statement-breakpoint
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_short_name_tournament_id_pk" PRIMARY KEY("short_name","tournament_id");