import { closeDatabase, db } from '../src/platform/database';
import { worldCupEditions } from '../src/products/almanac/domains/editions/schema';
import { nationalTeams } from '../src/products/almanac/domains/teams/schema';

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

const teams = [
  {
    code: 'ARG',
    displayName: 'Argentina',
  },
  {
    code: 'BRA',
    displayName: 'Brazil',
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

  for (const team of teams) {
    await db
      .insert(nationalTeams)
      .values(team)
      .onConflictDoUpdate({
        target: nationalTeams.code,
        set: {
          displayName: team.displayName,
          updatedAt: new Date(),
        },
      });
  }

  console.log(
    `Seeded ${editions.length} Almanac World Cup editions and ${teams.length} national teams.`
  );
};

seedAlmanac()
  .catch(error => {
    console.error('Unable to seed Almanac data', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
