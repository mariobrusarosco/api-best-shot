import { date, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const almanacSchema = pgSchema('almanac');

export const players = almanacSchema.table(
  'players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull(),
    givenName: text('given_name'),
    familyName: text('family_name').notNull(),
    displayName: text('display_name').notNull(),
    birthDate: date('birth_date'),
    wikipediaUrl: text('wikipedia_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex('players_source_key_unique').on(table.sourceKey)]
);
