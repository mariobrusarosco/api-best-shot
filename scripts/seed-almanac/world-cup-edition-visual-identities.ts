import { worldCupEditionVisualIdentities } from "../../src/products/almanac/domains/editions/schema";
import type { SeedTransaction } from "./database";
import { assetPlaceholder, readSeedSource } from "./source";
import type { SeededEdition } from "../../src/products/almanac/domains/editions/types";

type EditionVisualIdentitySource = {
  worldCupId: string;
  accent: string;
  accentText: string;
  spineColor: string;
};

const visualIdentities = readSeedSource<EditionVisualIdentitySource>(
  "world_cup_visual_identities.json",
);

export const seedWorldCupEditionVisualIdentities = async (
  transaction: SeedTransaction,
  updatedAt: Date,
  editionsBySourceKey: ReadonlyMap<string, SeededEdition>,
): Promise<number> => {
  let seededCount = 0;

  for (const visualIdentity of visualIdentities) {
    const edition = editionsBySourceKey.get(visualIdentity.worldCupId);

    if (!edition) {
      continue;
    }

    await transaction
      .insert(worldCupEditionVisualIdentities)
      .values({
        editionId: edition.id,
        logoAssetKey: `editions/${edition.year}-logo.svg`,
        trophyAssetKey: assetPlaceholder,
        accentColor: visualIdentity.accent,
        accentTextColor: visualIdentity.accentText,
        spineColor: visualIdentity.spineColor,
      })
      .onConflictDoUpdate({
        target: worldCupEditionVisualIdentities.editionId,
        set: {
          logoAssetKey: `editions/${edition.year}-logo.svg`,
          trophyAssetKey: assetPlaceholder,
          accentColor: visualIdentity.accent,
          accentTextColor: visualIdentity.accentText,
          spineColor: visualIdentity.spineColor,
          updatedAt,
        },
      });

    seededCount += 1;
  }

  return seededCount;
};
