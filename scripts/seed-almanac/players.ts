import { sql } from 'drizzle-orm';
import { players } from '../../src/products/almanac/domains/players/schema';
import type { PlayerSourceRecord } from '../../src/products/almanac/domains/players/types';
import type { SeedTransaction } from './database';
import { readSeedSource } from './source';

const sourcePlayers = readSeedSource<PlayerSourceRecord>('players.json');
const batchSize = 500;

const toDisplayName = (player: PlayerSourceRecord): string =>
  player.givenName === null
    ? player.familyName
    : `${player.givenName} ${player.familyName}`;

const toNullableSourceValue = (value: string): string | null =>
  value === '' || value === 'not available' ? null : value;

export const seedPlayers = async (
  transaction: SeedTransaction,
  updatedAt: Date
): Promise<number> => {
  for (let index = 0; index < sourcePlayers.length; index += batchSize) {
    const batch = sourcePlayers.slice(index, index + batchSize).map(player => ({
      sourceKey: player.id,
      givenName: player.givenName,
      familyName: player.familyName,
      displayName: toDisplayName(player),
      birthDate: toNullableSourceValue(player.birthDate),
      wikipediaUrl: toNullableSourceValue(player.wikipediaUrl),
      updatedAt,
    }));

    await transaction
      .insert(players)
      .values(batch)
      .onConflictDoUpdate({
        target: players.sourceKey,
        set: {
          givenName: sql`excluded.given_name`,
          familyName: sql`excluded.family_name`,
          displayName: sql`excluded.display_name`,
          birthDate: sql`excluded.birth_date`,
          wikipediaUrl: sql`excluded.wikipedia_url`,
          updatedAt,
        },
      });
  }

  return sourcePlayers.length;
};
