import { worldCupEditions } from "../../src/products/almanac/domains/editions/schema";
import type { SeedTransaction } from "./database";
import { assetPlaceholder, readSeedSource } from "./source";

type TournamentSource = {
  id: string;
  year: number;
  name: string;
  hostCountry: string;
};

export type SeededEdition = {
  id: string;
  year: number;
};

const tournaments = readSeedSource<TournamentSource>("tournaments.json");

export const seedWorldCupEditions = async (
  transaction: SeedTransaction,
  updatedAt: Date,
): Promise<{
  count: number;
  bySourceKey: Map<string, SeededEdition>;
}> => {
  for (const tournament of tournaments) {
    await transaction
      .insert(worldCupEditions)
      .values({
        sourceKey: tournament.id,
        year: tournament.year,
        name: tournament.name,
        hostDisplayName: tournament.hostCountry,
        hostFlagAssetKey: assetPlaceholder,
      })
      .onConflictDoUpdate({
        target: worldCupEditions.year,
        set: {
          sourceKey: tournament.id,
          name: tournament.name,
          hostDisplayName: tournament.hostCountry,
          hostFlagAssetKey: assetPlaceholder,
          updatedAt,
        },
      });
  }

  const sourceKeys = new Set(tournaments.map((tournament) => tournament.id));
  const editions = await transaction
    .select({
      id: worldCupEditions.id,
      sourceKey: worldCupEditions.sourceKey,
      year: worldCupEditions.year,
    })
    .from(worldCupEditions);

  return {
    count: tournaments.length,
    bySourceKey: new Map(
      editions
        .filter((edition) => sourceKeys.has(edition.sourceKey))
        .map((edition) => [
          edition.sourceKey,
          { id: edition.id, year: edition.year },
        ]),
    ),
  };
};
