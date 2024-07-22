CREATE TABLE IF NOT EXISTS "guess" (
	"member_id" uuid NOT NULL,
	"match_id" numeric NOT NULL,
	"tournament_id" uuid NOT NULL,
	"home_score" numeric NOT NULL,
	"away_score" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guess_match_id_member_id_pk" PRIMARY KEY("match_id","member_id")
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "match" (
	"external_id" numeric NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" numeric,
	"date" date,
	"time" text,
	"home_score" numeric,
	"away_score" numeric,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"stadium" text,
	"game_started" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_tournament_id_round_id_pk" PRIMARY KEY("tournament_id","round_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nick_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_email_unique" UNIQUE("email")
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
CREATE TABLE IF NOT EXISTS "tournament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_label_unique" UNIQUE("label")
);
