import { integer, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const T_Tournament = pgTable(
  'tournament',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    baseUrl: text('base_url').notNull(),
    slug: text('slug').notNull().default(''),
    provider: text('provider').notNull(),
    season: text('season').notNull(),
    currentRound: integer('current_round').default(0),
    mode: text('mode').notNull(),
    standingsMode: text('standings_mode').notNull().default(''),
    label: text('label').notNull(),
    logo: text('logo').notNull().default(''),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      uniqueExternalIdSlug: uniqueIndex('unique_external_id_slug').on(table.externalId, table.slug),
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

export const T_TournamentMember = pgTable(
  'tournament_member',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tournamentId: uuid('tournament_id').notNull(),
    memberId: uuid('member_id').notNull(),
    points: integer('points').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      uniqueMemberTournament: uniqueIndex('unique_member_tournament').on(table.memberId, table.tournamentId),
    };
  }
);

export type DB_InsertTournamentMember = typeof T_TournamentMember.$inferInsert;
export type DB_UpdateTournamentMember = typeof T_TournamentMember.$inferInsert;
export type DB_SelectTournamentMember = typeof T_TournamentMember.$inferSelect;
