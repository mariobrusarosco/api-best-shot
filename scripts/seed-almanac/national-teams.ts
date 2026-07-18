import { nationalTeams } from "../../src/products/almanac/domains/teams/schema";
import type {
  NationalTeamSourceRecord,
  SeededNationalTeam,
} from "../../src/products/almanac/domains/teams/types";
import type { SeedTransaction } from "./database";
import { readSeedSource } from "./source";

export const teamSourceAliases: Readonly<Record<string, string>> = {
  "T-86": "T-31",
};

const sourceTeams = readSeedSource<NationalTeamSourceRecord>("teams.json");
const teamsBySourceId = new Map(sourceTeams.map((team) => [team.id, team]));
const canonicalTeamSourceIds = new Set(
  sourceTeams.map((team) => teamSourceAliases[team.id] ?? team.id),
);
const canonicalTeams = [...canonicalTeamSourceIds].map(
  (sourceId) => teamsBySourceId.get(sourceId)!,
);

export const seedNationalTeams = async (
  transaction: SeedTransaction,
  updatedAt: Date,
): Promise<{
  count: number;
  bySourceKey: Map<string, SeededNationalTeam>;
}> => {
  for (const team of canonicalTeams) {
    const flagAssetKey = `teams/team-${team.code}.svg`;

    await transaction
      .insert(nationalTeams)
      .values({
        code: team.code,
        displayName: team.name,
        flagAssetKey,
      })
      .onConflictDoUpdate({
        target: nationalTeams.code,
        set: {
          displayName: team.name,
          flagAssetKey,
          updatedAt,
        },
      });
  }

  const seededTeams = await transaction
    .select({
      id: nationalTeams.id,
      code: nationalTeams.code,
    })
    .from(nationalTeams);
  const teamsByCode = new Map(seededTeams.map((team) => [team.code, team]));

  return {
    count: canonicalTeams.length,
    bySourceKey: new Map(
      sourceTeams.map((sourceTeam) => {
        const canonicalSourceId = teamSourceAliases[sourceTeam.id] ?? sourceTeam.id;
        const canonicalSourceTeam = teamsBySourceId.get(canonicalSourceId);

        if (canonicalSourceTeam === undefined) {
          throw new Error(`Unknown canonical team source ${canonicalSourceId}`);
        }

        const seededTeam = teamsByCode.get(canonicalSourceTeam.code);

        if (seededTeam === undefined) {
          throw new Error(`Team ${canonicalSourceTeam.code} was not seeded`);
        }

        return [sourceTeam.id, seededTeam];
      }),
    ),
  };
};
