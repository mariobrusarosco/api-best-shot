import { sql } from 'drizzle-orm';
import { players } from '../../src/products/almanac/domains/players/schema';
import { worldCupEditionTeams } from '../../src/products/almanac/domains/participations/schema';
import { worldCupSquadPlayers } from '../../src/products/almanac/domains/squads/schema';
import type { WorldCupSquadPlayerSourceRecord } from '../../src/products/almanac/domains/squads/types';
import type { SeedTransaction } from './database';
import { readSeedSource } from './source';

const sourceSquadPlayers = readSeedSource<WorldCupSquadPlayerSourceRecord>(
  'world_cup_squads.json'
);
const batchSize = 500;

export const seedWorldCupSquadPlayers = async (
  transaction: SeedTransaction,
  updatedAt: Date
): Promise<number> => {
  const seededPlayers = await transaction
    .select({ id: players.id, sourceKey: players.sourceKey })
    .from(players);
  const playersBySourceKey = new Map(
    seededPlayers.map(player => [player.sourceKey, player.id])
  );
  const seededParticipations = await transaction
    .select({ id: worldCupEditionTeams.id, sourceKey: worldCupEditionTeams.sourceKey })
    .from(worldCupEditionTeams);
  const participationsBySourceKey = new Map(
    seededParticipations.map(participation => [participation.sourceKey, participation.id])
  );

  const records = sourceSquadPlayers.map(squadPlayer => {
    const participationSourceKey = `${squadPlayer.worldCupId}:${squadPlayer.teamId}`;
    const participationId = participationsBySourceKey.get(participationSourceKey);
    const playerId = playersBySourceKey.get(squadPlayer.playerId);

    if (participationId === undefined) {
      throw new Error(`Unknown participation source ${participationSourceKey}`);
    }

    if (playerId === undefined) {
      throw new Error(`Unknown player source ${squadPlayer.playerId}`);
    }

    return {
      sourceKey: squadPlayer.id,
      participationId,
      playerId,
      shirtNumber: squadPlayer.shirtNumber,
      positionCode: squadPlayer.positionCode,
      updatedAt,
    };
  });

  for (let index = 0; index < records.length; index += batchSize) {
    await transaction
      .insert(worldCupSquadPlayers)
      .values(records.slice(index, index + batchSize))
      .onConflictDoUpdate({
        target: worldCupSquadPlayers.sourceKey,
        set: {
          participationId: sql`excluded.participation_id`,
          playerId: sql`excluded.player_id`,
          shirtNumber: sql`excluded.shirt_number`,
          positionCode: sql`excluded.position_code`,
          updatedAt,
        },
      });
  }

  return records.length;
};
