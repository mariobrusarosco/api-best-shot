import { closeDatabase, db } from "../src/platform/database";
import { seedNationalTeams } from "./seed-almanac/national-teams";
import { seedWorldCupEditionVisualIdentities } from "./seed-almanac/world-cup-edition-visual-identities";
import { seedWorldCupEditions } from "./seed-almanac/world-cup-editions";

const seedAlmanac = async (): Promise<void> => {
  const result = await db.transaction(async (transaction) => {
    const updatedAt = new Date();
    const editions = await seedWorldCupEditions(transaction, updatedAt);
    const visualIdentityCount = await seedWorldCupEditionVisualIdentities(
      transaction,
      updatedAt,
      editions.bySourceKey,
    );
    const nationalTeamCount = await seedNationalTeams(transaction, updatedAt);

    return {
      editionCount: editions.count,
      visualIdentityCount,
      nationalTeamCount,
    };
  });

  console.log(
    `Seeded ${result.editionCount} Almanac World Cup editions, ${result.visualIdentityCount} edition visual identities, and ${result.nationalTeamCount} national teams.`,
  );
};

seedAlmanac()
  .catch((error) => {
    console.error("Unable to seed Almanac data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
