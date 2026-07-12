import { closeDatabase, db } from '../src/platform/database';
import { worldCupEditions } from '../src/products/almanac/domains/editions/schema';

const editions = [
  {
    sourceKey: 'fifa-world-cup-2022',
    year: 2022,
    name: '2022 FIFA World Cup',
    hostDisplayName: 'Qatar',
    logoAssetKey: 'editions/2022-logo.svg',
  },
  {
    sourceKey: 'fifa-world-cup-2018',
    year: 2018,
    name: '2018 FIFA World Cup',
    hostDisplayName: 'Russia',
    logoAssetKey: 'editions/2018-logo.svg',
  },
] as const;

const seedAlmanac = async (): Promise<void> => {
  for (const edition of editions) {
    await db
      .insert(worldCupEditions)
      .values(edition)
      .onConflictDoUpdate({
        target: worldCupEditions.sourceKey,
        set: {
          year: edition.year,
          name: edition.name,
          hostDisplayName: edition.hostDisplayName,
          logoAssetKey: edition.logoAssetKey,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${editions.length} Almanac World Cup editions.`);
};

seedAlmanac()
  .catch(error => {
    console.error('Unable to seed Almanac data', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
