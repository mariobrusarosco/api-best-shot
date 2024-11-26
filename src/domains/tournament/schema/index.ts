import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const TTournament = pgTable('tournament', {
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
    .$onUpdate(() => new Date())
})

export type InsertTournament = typeof TTournament.$inferInsert
export type SelectTournament = typeof TTournament.$inferSelect
