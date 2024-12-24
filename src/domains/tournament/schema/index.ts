import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Tournament = pgTable(
  'tournament',
  {
    id: uuid('id').defaultRandom(),
    externalId: text('external_id').notNull(),
    baseUrl: text('base_url').notNull(),
    slug: text('slug').notNull().default(''),
    provider: text('provider').notNull(),
    season: text('season').notNull(),
    mode: text('mode').notNull(),
    label: text('label').notNull(),
    logo: text('logo').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.provider, table.externalId] }),
    };
  }
);

export type DB_InsertTournament = Omit<typeof T_Tournament.$inferInsert, 'id'>;
export type DB_UpdateTournament = typeof T_Tournament.$inferInsert;
export type DB_SelectTournament = typeof T_Tournament.$inferSelect;

export const T_TournamentStandings = pgTable(
  'tournament_standings',
  {
    id: uuid('id').defaultRandom(),
    teamExternalId: text('team_external_id').notNull(),
    tournamentId: text('tournament_id').notNull(),
    order: text('order').notNull(),
    shortName: text('shortame').notNull(),
    longName: text('longame').notNull(),
    points: text('points').notNull(),
    games: text('games').notNull(),
    wins: text('wins').notNull(),
    draws: text('draws').notNull(),
    losses: text('losses').notNull(),
    gf: text('gf').notNull(),
    ga: text('ga').notNull(),
    gd: text('gd').notNull(),
    provider: text('provider').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({
        columns: [table.teamExternalId, table.provider, table.tournamentId],
      }),
    };
  }
);

export type DB_InsertTournamentStandings = typeof T_TournamentStandings.$inferInsert;
export type DB_UpdateTournamentStandings = typeof T_TournamentStandings.$inferInsert;
export type DB_SelectTournamentStandings = typeof T_TournamentStandings.$inferSelect;

export const T_TournamentRound = pgTable(
  'tournament_round',
  {
    id: uuid('id').defaultRandom(),
    tournamentId: text('tournament_id').notNull(),
    order: text('order').notNull(),
    label: text('label').notNull(),
    slug: text('slug').notNull(),
    type: text('type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({
        columns: [table.tournamentId, table.order],
      }),
    };
  }
);

export type DB_InsertTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_UpdateTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_SelectTournamentRound = typeof T_TournamentRound.$inferSelect;
