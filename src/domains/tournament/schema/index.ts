import { numeric, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Tournament = pgTable('tournament', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull().unique(),
  standingsUrl: text('standings_url').notNull(),
  roundsUrl: text('rounds_url').notNull(),
  rounds: numeric('rounds').notNull(),
  provider: text('provider').notNull(),
  season: text('season').notNull(),
  mode: text('mode').notNull(),
  label: text('label').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DB_InsertTournament = typeof T_Tournament.$inferInsert;
export type DB_UpdateTournament = typeof T_Tournament.$inferInsert;
export type DB_SelectTournament = typeof T_Tournament.$inferSelect;

export const T_TournamentExternal = pgTable(
  'tournament_external',
  {
    tournamentId: uuid('tournament_id').notNull(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.tournamentId, table.externalId] }),
    };
  }
);
