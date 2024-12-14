DO $$ BEGIN
 ALTER TABLE "guess" ADD CONSTRAINT "guess_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
