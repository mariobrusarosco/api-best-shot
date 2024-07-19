CREATE TABLE IF NOT EXISTS "tournament_external_id" (
	"tournament_id" uuid NOT NULL,
	"external_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
