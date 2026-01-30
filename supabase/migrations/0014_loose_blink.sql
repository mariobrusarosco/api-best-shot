ALTER TABLE "tournament_standings" ALTER COLUMN "tournament_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "points" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "points" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "games" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "games" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "wins" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "wins" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "draws" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "draws" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "losses" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "losses" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goals_for" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goals_for" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goals_against" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goals_against" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goal_difference" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tournament_standings" ALTER COLUMN "goal_difference" SET DEFAULT 0;