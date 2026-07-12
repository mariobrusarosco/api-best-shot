import { nationalTeams } from "../../src/products/almanac/domains/teams/schema";
import type { SeedTransaction } from "./database";
import { readSeedSource } from "./source";

type TeamSource = {
  id: string;
  name: string;
  code: string;
};

export const teamSourceAliases: Readonly<Record<string, string>> = {
  "T-86": "T-31",
};

const sourceTeams = readSeedSource<TeamSource>("teams.json");
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
): Promise<number> => {
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

  return canonicalTeams.length;
};
