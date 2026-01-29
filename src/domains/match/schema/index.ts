import { index, numeric, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { T_Team } from '@/domains/team/schema';

export const T_Match = pgTable(
  'match',
  {
    id: uuid('id').notNull().defaultRandom(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    roundSlug: text('round_slug').notNull(),
    homeTeamId: uuid('home_team_id').references(() => T_Team.id),
    externalHomeTeamId: text('external_home_team_id').notNull(),
    homeScore: numeric('home_score'),
    homePenaltiesScore: numeric('home_penalties_score'),
    awayTeamId: uuid('away_team_id').references(() => T_Team.id),
    externalAwayTeamId: text('external_away_team_id').notNull(),
    awayScore: numeric('away_score'),
    awayPenaltiesScore: numeric('away_penalties_score'),
    date: timestamp('date'),
    time: text('time'),
    stadium: text('stadium'),
    status: text('status').notNull(),
    tournamentMatch: text('tournament_match'),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.externalId, table.provider] }),
    // Indexes for query performance
    statusIdx: index('match_status_idx').on(table.status),
    tournamentRoundsIdx: index('match_tournament_rounds_idx').on(table.tournamentId, table.roundSlug),
    pollingIdx: index('match_polling_idx').on(table.status, table.date, table.lastCheckedAt),
  })
);

export type DB_InsertMatch = typeof T_Match.$inferInsert;
export type DB_UpdateMatch = typeof T_Match.$inferInsert;
export type DB_SelectMatch = typeof T_Match.$inferSelect;
