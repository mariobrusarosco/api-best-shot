import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const T_League = pgTable('league', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').notNull(),
  label: text('label').unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type InsertLeague = typeof T_League.$inferInsert;
export type SelectLeague = typeof T_League.$inferSelect;

export const T_LeagueRole = pgTable('league_role', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').notNull(),
  memberId: uuid('member_id').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const T_LeagueTournament = pgTable(
  'league_tournament',
  {
    id: uuid('id').defaultRandom(),
    leagueId: uuid('league_id').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    status: text('status'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.leagueId, table.tournamentId] }),
      uniqueTournament: uniqueIndex('unique_tournament').on(
        table.leagueId,
        table.tournamentId
      ),
    };
  }
);

export type InsertLeagueTournament = typeof T_LeagueTournament.$inferInsert;
export type UpdateLeagueTournament = typeof T_LeagueTournament.$inferInsert;
export type SelectLeagueTournament = typeof T_LeagueTournament.$inferSelect;
