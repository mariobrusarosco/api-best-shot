import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const TMatch = pgTable('match', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull().unique(),
  provider: text('provider').notNull(),
  tournamentExternalId: text('tournament_id').notNull(),
  roundId: text('round_id'),
  homeTeamId: text('home_team_id').notNull(),
  awayTeamId: text('away_team_id').notNull(),
  homeScore: numeric('home_score'),
  awayScore: numeric('away_score'),
  date: timestamp('date', { withTimezone: true }),
  time: text('time'),
  stadium: text('stadium'),
  status: text('status'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type InsertMatch = typeof TMatch.$inferInsert;
export type UpdateMatch = typeof TMatch.$inferSelect;
export type SelectMatch = typeof TMatch.$inferSelect;
