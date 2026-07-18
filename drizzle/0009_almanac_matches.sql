CREATE TABLE "almanac"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"match_id" uuid NOT NULL,
	"benefiting_participation_id" uuid NOT NULL,
	"credited_participation_id" uuid NOT NULL,
	"credited_squad_player_id" uuid,
	"minute_regulation" smallint NOT NULL,
	"minute_stoppage" smallint NOT NULL,
	"match_period" text NOT NULL,
	"own_goal" boolean NOT NULL,
	"penalty" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "almanac"."matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"home_participation_id" uuid NOT NULL,
	"away_participation_id" uuid NOT NULL,
	"match_date" date NOT NULL,
	"stage" text NOT NULL,
	"group_name" text,
	"home_score" smallint NOT NULL,
	"away_score" smallint NOT NULL,
	"extra_time" boolean NOT NULL,
	"penalty_shootout" boolean NOT NULL,
	"home_penalty_score" smallint,
	"away_penalty_score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "almanac"."goals" ADD CONSTRAINT "goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "almanac"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."goals" ADD CONSTRAINT "goals_benefiting_participation_id_world_cup_edition_teams_id_fk" FOREIGN KEY ("benefiting_participation_id") REFERENCES "almanac"."world_cup_edition_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."goals" ADD CONSTRAINT "goals_credited_participation_id_world_cup_edition_teams_id_fk" FOREIGN KEY ("credited_participation_id") REFERENCES "almanac"."world_cup_edition_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."goals" ADD CONSTRAINT "goals_credited_squad_player_id_world_cup_squad_players_id_fk" FOREIGN KEY ("credited_squad_player_id") REFERENCES "almanac"."world_cup_squad_players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."matches" ADD CONSTRAINT "matches_home_participation_id_world_cup_edition_teams_id_fk" FOREIGN KEY ("home_participation_id") REFERENCES "almanac"."world_cup_edition_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."matches" ADD CONSTRAINT "matches_away_participation_id_world_cup_edition_teams_id_fk" FOREIGN KEY ("away_participation_id") REFERENCES "almanac"."world_cup_edition_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goals_source_key_unique" ON "almanac"."goals" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_source_key_unique" ON "almanac"."matches" USING btree ("source_key");