import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const worldCupEditions = pgTable(
  'world_cup_editions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull(),
    year: smallint('year').notNull(),
    name: text('name').notNull(),
    hostDisplayName: text('host_display_name').notNull(),
    hostAssetPath: text('host_asset_path'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('world_cup_editions_source_key_unique').on(table.sourceKey),
    uniqueIndex('world_cup_editions_year_unique').on(table.year),
    check('world_cup_editions_year_check', sql`${table.year} BETWEEN 1930 AND 2100`),
  ]
);
