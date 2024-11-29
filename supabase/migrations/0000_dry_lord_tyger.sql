CREATE TABLE IF NOT EXISTS "league_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"founder_id" uuid NOT NULL,
	"label" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_external_id" (
	"tournament_id" uuid NOT NULL,
	"external_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guess" (
	"id" uuid DEFAULT gen_random_uuid(),
	"member_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"home_score" numeric NOT NULL,
	"away_score" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guess_match_id_member_id_pk" PRIMARY KEY("match_id","member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"round_id" text,
	"tournament_id" uuid NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"home_score" numeric,
	"away_score" numeric,
	"date" timestamp with time zone,
	"time" text,
	"stadium" text,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nick_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "member_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"external_id" text NOT NULL,
	"short_name" text,
	"badge" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"rounds" numeric NOT NULL,
	"provider" text NOT NULL,
	"season" text NOT NULL,
	"mode" text NOT NULL,
	"slug" text NOT NULL,
	"label" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "tournament_label_unique" UNIQUE("label")
);
