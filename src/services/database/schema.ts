import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const MEMBER_TABLE = pgTable('member', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date())
})

export const TOURNAMENT_EXTERNAL_ID = pgTable('tournament_external_id', {
  tournamentId: uuid('tournament_id').notNull(),
  externalId: text('external_id').notNull().primaryKey(),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date())
})

export const TOURNAMENT_TABLE = pgTable('tournament', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').unique(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTournament = typeof TOURNAMENT_TABLE.$inferInsert
export type SelectTournament = typeof TOURNAMENT_TABLE.$inferSelect
