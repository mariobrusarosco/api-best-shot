CREATE TABLE IF NOT EXISTS "tournament_round" (
    "id" uuid DEFAULT gen_random_uuid(),
    "tournament_id" text NOT NULL,
    "order" text NOT NULL,
    "label" text NOT NULL,
    "slug" text,
    "knockout_id" text DEFAULT '',
    "prefix" text DEFAULT '',
    "provider_url" text NOT NULL,
    "type" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "tournament_round_tournament_id_slug_pk" PRIMARY KEY("tournament_id","slug")
);--> statement-breakpoint

ALTER TABLE "tournament_round" ALTER COLUMN "slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournament_round" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_round" ADD COLUMN "provider_id" text NOT NULL;