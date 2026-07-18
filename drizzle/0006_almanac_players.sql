CREATE TABLE "almanac"."players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"given_name" text,
	"family_name" text NOT NULL,
	"display_name" text NOT NULL,
	"birth_date" date,
	"wikipedia_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "players_source_key_unique" ON "almanac"."players" USING btree ("source_key");