CREATE TABLE "almanac"."world_cup_edition_visual_identities" (
	"edition_id" uuid PRIMARY KEY NOT NULL,
	"logo_asset_key" text,
	"trophy_asset_key" text,
	"accent_color" text NOT NULL,
	"accent_text_color" text NOT NULL,
	"spine_color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_edition_visual_identities" ADD CONSTRAINT "world_cup_edition_visual_identities_edition_id_world_cup_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "almanac"."world_cup_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almanac"."world_cup_editions" DROP COLUMN "logo_asset_key";