import {
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const T_Tournament = pgTable(
  'tournament',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    baseUrl: text('base_url').notNull(),
    slug: text('slug').notNull().default(''),
    provider: text('provider').notNull(),
    season: text('season').notNull(),
    mode: text('mode').notNull(),
    standings: text('standings').notNull().default(''),
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
      pk: primaryKey({ columns: [table.id] }),
      uniqueProviderExternalId: uniqueIndex('unique_provider_external_id').on(
        table.provider,
        table.externalId
      ), // Unique constraint on composite key
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
    order: numeric('order').notNull(),
    groupName: text('group_name').default(''),
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
        columns: [table.shortName, table.tournamentId],
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
    slug: text('slug').default(''),
    knockoutId: text('knockout_id').default(''),
    prefix: text('prefix').default(''),
    providerUrl: text('provider_url').notNull(),
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
        columns: [table.tournamentId, table.slug],
      }),
    };
  }
);

export type DB_InsertTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_UpdateTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_SelectTournamentRound = typeof T_TournamentRound.$inferSelect;
