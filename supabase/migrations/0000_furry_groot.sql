CREATE TABLE IF NOT EXISTS "match" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"provider" text NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_slug" text NOT NULL,
	"home_team_id" text NOT NULL,
	"home_score" numeric,
	"home_penalties_score" numeric,
	"away_team_id" text NOT NULL,
	"away_score" numeric,
	"away_penalties_score" numeric,
	"date" timestamp,
	"time" text,
	"stadium" text,
	"status" text NOT NULL,
	"tournament_match" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_external_id_provider_pk" PRIMARY KEY("external_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guess" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"round_id" text DEFAULT '' NOT NULL,
	"home_score" numeric,
	"active" boolean DEFAULT true NOT NULL,
	"away_score" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guess_match_id_member_id_pk" PRIMARY KEY("match_id","member_id")
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
CREATE TABLE IF NOT EXISTS "league_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_tournament" (
	"id" uuid DEFAULT gen_random_uuid(),
	"league_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_tournament_league_id_tournament_id_pk" PRIMARY KEY("league_id","tournament_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nick_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "member_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_performance" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"points" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_performance_member_id_league_id_pk" PRIMARY KEY("member_id","league_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_performance" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"points" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_performance_member_id_tournament_id_pk" PRIMARY KEY("member_id","tournament_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team" (
	"id" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"external_id" text NOT NULL,
	"short_name" text,
	"badge" text NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_provider_external_id_pk" PRIMARY KEY("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament" (
	"id" uuid DEFAULT gen_random_uuid(),
	"external_id" text NOT NULL,
	"base_url" text NOT NULL,
	"slug" text DEFAULT '',
	"provider" text NOT NULL,
	"season" text NOT NULL,
	"mode" text NOT NULL,
	"standings_mode" text DEFAULT '',
	"label" text NOT NULL,
	"logo" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_round" (
	"id" uuid DEFAULT gen_random_uuid(),
	"tournament_id" text NOT NULL,
	"order" text NOT NULL,
	"label" text NOT NULL,
	"slug" text DEFAULT '',
	"knockout_id" text DEFAULT '',
	"prefix" text DEFAULT '',
	"provider_url" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_round_tournament_id_slug_pk" PRIMARY KEY("tournament_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_standings" (
	"id" uuid DEFAULT gen_random_uuid(),
	"team_external_id" text NOT NULL,
	"tournament_id" text NOT NULL,
	"order" numeric NOT NULL,
	"group_name" text DEFAULT '',
	"shortame" text NOT NULL,
	"longame" text NOT NULL,
	"points" text NOT NULL,
	"games" text NOT NULL,
	"wins" text NOT NULL,
	"draws" text NOT NULL,
	"losses" text NOT NULL,
	"gf" text NOT NULL,
	"ga" text NOT NULL,
	"gd" text NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_standings_shortame_tournament_id_pk" PRIMARY KEY("shortame","tournament_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_guess" ON "guess" USING btree ("match_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tournament" ON "league_tournament" USING btree ("league_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_league_perfomance" ON "league_performance" USING btree ("member_id","league_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_tournament_perfomance" ON "tournament_performance" USING btree ("member_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_provider_external_id" ON "tournament" USING btree ("provider","external_id");