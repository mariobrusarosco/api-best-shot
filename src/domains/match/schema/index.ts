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

export const TMatch = pgTable('match', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull(),
  roundId: numeric('round_id'),
  tournamentId: uuid('tournament_id').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  date: timestamp('date', { withTimezone: true }),
  status: text('status'),
  homeScore: numeric('home_score'),
  awayScore: numeric('away_score'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
