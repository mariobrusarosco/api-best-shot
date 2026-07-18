import {
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { worldCupEditionTeams } from '../participations/schema';
import { players } from '../players/schema';

const almanacSchema = pgSchema('almanac');

export const worldCupSquadPlayers = almanacSchema.table(
  'world_cup_squad_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull(),
    participationId: uuid('participation_id')
      .notNull()
      .references(() => worldCupEditionTeams.id, { onDelete: 'restrict' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'restrict' }),
    shirtNumber: smallint('shirt_number'),
    positionCode: varchar('position_code', { length: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('world_cup_squad_players_source_key_unique').on(table.sourceKey),
    uniqueIndex('world_cup_squad_players_participation_player_unique').on(
      table.participationId,
      table.playerId
    ),
  ]
);
