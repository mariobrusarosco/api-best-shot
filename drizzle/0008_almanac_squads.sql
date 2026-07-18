CREATE TABLE "almanac"."world_cup_squad_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"participation_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"shirt_number" smallint,
	"position_code" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_squad_players" ADD CONSTRAINT "world_cup_squad_players_participation_id_world_cup_edition_teams_id_fk" FOREIGN KEY ("participation_id") REFERENCES "almanac"."world_cup_edition_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_squad_players" ADD CONSTRAINT "world_cup_squad_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "almanac"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_squad_players_source_key_unique" ON "almanac"."world_cup_squad_players" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_squad_players_participation_player_unique" ON "almanac"."world_cup_squad_players" USING btree ("participation_id","player_id");
