CREATE TABLE "world_cup_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"year" smallint NOT NULL,
	"name" text NOT NULL,
	"host_display_name" text NOT NULL,
	"host_asset_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_cup_editions_year_check" CHECK ("world_cup_editions"."year" BETWEEN 1930 AND 2100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_editions_source_key_unique" ON "world_cup_editions" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "world_cup_editions_year_unique" ON "world_cup_editions" USING btree ("year");