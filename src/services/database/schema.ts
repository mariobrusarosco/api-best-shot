import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export * from '../../domains/guess/schema'
export * from '../../domains/match/schema'
export * from '../../domains/team/schema'
export * from '../../domains/tournament/schema'

export const MEMBER_TABLE = pgTable('member', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nickName: text('nick_name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
export type SelectMember = typeof MEMBER_TABLE.$inferSelect

export const LEAGUE_TABLE = pgTable('league', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').notNull(),
  label: text('label').unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export type InsertLeague = typeof LEAGUE_TABLE.$inferInsert
export type SelectLeague = typeof LEAGUE_TABLE.$inferSelect

export const LEAGUE_ROLE_TABLE = pgTable('league_role', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').notNull(),
  memberId: uuid('member_id').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export const TOURNAMENT_EXTERNAL_ID = pgTable('tournament_external_id', {
  tournamentId: uuid('tournament_id').notNull(),
  externalId: text('external_id').notNull().primaryKey(),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
