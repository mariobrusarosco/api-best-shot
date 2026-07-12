ALTER TABLE "almanac"."world_cup_editions" RENAME COLUMN "host_asset_path" TO "logo_asset_key";
--> statement-breakpoint
UPDATE "almanac"."world_cup_editions"
SET "logo_asset_key" = CASE "source_key"
	WHEN 'fifa-world-cup-2022' THEN 'editions/2022-logo.svg'
	WHEN 'fifa-world-cup-2018' THEN 'editions/2018-logo.svg'
	ELSE regexp_replace("logo_asset_key", '^/+', '')
END
WHERE "logo_asset_key" IS NOT NULL;
