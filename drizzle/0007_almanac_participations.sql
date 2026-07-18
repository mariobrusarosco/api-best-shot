CREATE TABLE "almanac"."world_cup_edition_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"edition_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"final_position" smallint NOT NULL,
	"official_final_position" smallint,
	"final_position_source" text NOT NULL,
	"final_stage" text NOT NULL,
	"matches_played" smallint NOT NULL,
	"wins" smallint NOT NULL,
	"draws" smallint NOT NULL,
	"losses" smallint NOT NULL,
	"goals_for" smallint NOT NULL,
	"goals_against" smallint NOT NULL,
	"points" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_edition_teams" ADD CONSTRAINT "world_cup_edition_teams_edition_id_world_cup_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "almanac"."world_cup_editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_edition_teams" ADD CONSTRAINT "world_cup_edition_teams_team_id_national_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "almanac"."national_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_edition_teams_source_key_unique" ON "almanac"."world_cup_edition_teams" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_edition_teams_edition_team_unique" ON "almanac"."world_cup_edition_teams" USING btree ("edition_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_edition_teams_edition_final_position_unique" ON "almanac"."world_cup_edition_teams" USING btree ("edition_id","final_position");--> statement-breakpoint
CREATE INDEX "world_cup_edition_teams_team_id_index" ON "almanac"."world_cup_edition_teams" USING btree ("team_id");
