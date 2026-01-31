import { T_Team } from '@/domains/team/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { MATCH_STATUSES } from '../typing';

export const T_Match = pgTable(
  'match',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // ✅ FK (Task 6.1.1)
    roundSlug: text('round_slug').notNull(),
    homeTeamId: uuid('home_team_id')
      .notNull()
      .references(() => T_Team.id),
    externalHomeTeamId: text('external_home_team_id').notNull(),
    homeScore: integer('home_score'), // ✅ Integer
    homePenaltiesScore: integer('home_penalties_score'), // ✅ Integer
    awayTeamId: uuid('away_team_id')
      .notNull()
      .references(() => T_Team.id),
    externalAwayTeamId: text('external_away_team_id').notNull(),
    awayScore: integer('away_score'), // ✅ Integer
    awayPenaltiesScore: integer('away_penalties_score'), // ✅ Integer
    date: timestamp('date'),
    time: text('time'),
    stadium: text('stadium'),
    status: text('status', { enum: Object.values(MATCH_STATUSES) as [string, ...string[]] }).notNull(),
    tournamentMatch: text('tournament_match'),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueMatch: uniqueIndex('unique_match').on(table.externalId, table.provider),
    // Indexes for query performance
    statusIdx: index('match_status_idx').on(table.status),
    tournamentRoundsIdx: index('match_tournament_rounds_idx').on(table.tournamentId, table.roundSlug),
    pollingIdx: index('match_polling_idx').on(table.status, table.date, table.lastCheckedAt),
  })
);

export type DB_InsertMatch = typeof T_Match.$inferInsert;
export type DB_UpdateMatch = typeof T_Match.$inferInsert;
export type DB_SelectMatch = typeof T_Match.$inferSelect;
