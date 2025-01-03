import { numeric, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Match = pgTable(
  'match',
  {
    id: uuid('id').notNull().defaultRandom(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    roundSlug: text('round_slug').notNull(),
    homeTeamId: text('home_team_id').notNull(),
    awayTeamId: text('away_team_id').notNull(),
    homeScore: numeric('home_score'),
    awayScore: numeric('away_score'),
    date: timestamp('date'),
    time: text('time'),
    stadium: text('stadium'),
    status: text('status').notNull(),
    tournamentMatch: text('tournament_match'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.externalId, table.provider] }),
    };
  }
);

export type DB_InsertMatch = typeof T_Match.$inferInsert;
export type DB_UpdateMatch = typeof T_Match.$inferInsert;
export type DB_SelectMatch = typeof T_Match.$inferSelect;
