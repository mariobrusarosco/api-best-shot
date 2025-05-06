DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tournament' 
        AND column_name = 'standings'
    ) THEN
        ALTER TABLE "tournament" RENAME COLUMN "standings" TO "standings_mode";
    END IF;
END $$;