import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Tournament = pgTable('tournament', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull().unique(),
  rounds: numeric('rounds').notNull(),
  provider: text('provider').notNull(),
  season: text('season').notNull(),
  mode: text('mode').notNull(),
  slug: text('slug').notNull(),
  label: text('label').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DB_InsertTournament = typeof T_Tournament.$inferInsert;
export type DB_SelectTournament = typeof T_Tournament.$inferSelect;
