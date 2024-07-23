import { match } from 'assert'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  primaryKey,
  boolean,
  date
} from 'drizzle-orm/pg-core'

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

export const GUESS_TABLE = pgTable(
  'guess',
  {
    id: uuid('id').defaultRandom(),
    memberId: uuid('member_id').notNull(),
    matchId: text('match_id').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    homeScore: numeric('home_score').notNull(),
    awayScore: numeric('away_score').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.matchId, table.memberId] })
    }
  }
)

export type SelectGuess = typeof GUESS_TABLE.$inferSelect
export type InsertGuess = typeof GUESS_TABLE.$inferInsert

export const TOURNAMENT_TABLE = pgTable('tournament', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export type InsertTournament = typeof TOURNAMENT_TABLE.$inferInsert
export type SelectTournament = typeof TOURNAMENT_TABLE.$inferSelect

export const MATCH_TABLE = pgTable('match', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull(),
  tournamentId: uuid('tournament_id').notNull(),
  roundId: text('round_id'),
  date: date('date', { mode: 'date' }),
  time: text('time'),
  homeScore: numeric('home_score'),
  awayScore: numeric('away_score'),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  stadium: text('stadium'),
  gameStarted: boolean('game_started').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
