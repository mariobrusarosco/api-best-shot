DO $$ BEGIN
 ALTER TABLE "tournament_round" ADD CONSTRAINT "tournament_round_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
