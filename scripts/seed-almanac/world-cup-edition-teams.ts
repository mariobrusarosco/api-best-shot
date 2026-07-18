import { sql } from 'drizzle-orm';
import type { SeededEdition } from '../../src/products/almanac/domains/editions/types';
import { worldCupEditionTeams } from '../../src/products/almanac/domains/participations/schema';
import type { WorldCupEditionTeamSourceRecord } from '../../src/products/almanac/domains/participations/types';
import type { SeededNationalTeam } from '../../src/products/almanac/domains/teams/types';
import type { SeedTransaction } from './database';
import { readSeedSource } from './source';

const sourceParticipations = readSeedSource<WorldCupEditionTeamSourceRecord>(
  'world_cup_teams.json'
);
const batchSize = 250;

export const seedWorldCupEditionTeams = async (
  transaction: SeedTransaction,
  updatedAt: Date,
  editionsBySourceKey: Map<string, SeededEdition>,
  teamsBySourceKey: Map<string, SeededNationalTeam>
): Promise<number> => {
  const records = sourceParticipations.map(participation => {
    const edition = editionsBySourceKey.get(participation.worldCupId);
    const team = teamsBySourceKey.get(participation.teamId);

    if (edition === undefined) {
      throw new Error(`Unknown edition source ${participation.worldCupId}`);
    }

    if (team === undefined) {
      throw new Error(`Unknown team source ${participation.teamId}`);
    }

    return {
      sourceKey: participation.id,
      editionId: edition.id,
      teamId: team.id,
      finalPosition: participation.finish.finalPosition,
      officialFinalPosition: participation.finish.officialFinalPosition,
      finalPositionSource: participation.finish.finalPositionSource,
      finalStage: participation.finish.finalStage,
      matchesPlayed: participation.stats.matchesPlayed,
      wins: participation.stats.wins,
      draws: participation.stats.draws,
      losses: participation.stats.losses,
      goalsFor: participation.stats.goalsFor,
      goalsAgainst: participation.stats.goalsAgainst,
      points: participation.stats.points,
      updatedAt,
    };
  });

  for (let index = 0; index < records.length; index += batchSize) {
    await transaction
      .insert(worldCupEditionTeams)
      .values(records.slice(index, index + batchSize))
      .onConflictDoUpdate({
        target: worldCupEditionTeams.sourceKey,
        set: {
          editionId: sql`excluded.edition_id`,
          teamId: sql`excluded.team_id`,
          finalPosition: sql`excluded.final_position`,
          officialFinalPosition: sql`excluded.official_final_position`,
          finalPositionSource: sql`excluded.final_position_source`,
          finalStage: sql`excluded.final_stage`,
          matchesPlayed: sql`excluded.matches_played`,
          wins: sql`excluded.wins`,
          draws: sql`excluded.draws`,
          losses: sql`excluded.losses`,
          goalsFor: sql`excluded.goals_for`,
          goalsAgainst: sql`excluded.goals_against`,
          points: sql`excluded.points`,
          updatedAt,
        },
      });
  }

  return records.length;
};
