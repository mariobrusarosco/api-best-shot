import { T_Team } from '@/domains/team/schema';
import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
    teamId: uuid('team_id').references(() => T_Team.id), // Nullable for data migration
    teamExternalId: text('team_external_id').notNull(), // Keep for data migration
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id), // 🆕 FK to tournament
    order: integer('order').notNull(), // Changed from numeric to integer
    groupName: text('group_name').default(''),
    shortName: text('short_name').notNull(), // Fixed typo: was 'shortame'
    longName: text('long_name').notNull(), // Fixed typo: was 'longame'
    points: integer('points').notNull().default(0), // Changed from text to integer
    games: integer('games').notNull().default(0), // Changed from text to integer
    wins: integer('wins').notNull().default(0), // Changed from text to integer
    draws: integer('draws').notNull().default(0), // Changed from text to integer
    losses: integer('losses').notNull().default(0), // Changed from text to integer
    gf: integer('goals_for').notNull().default(0), // Changed from text to integer
    ga: integer('goals_against').notNull().default(0), // Changed from text to integer
    gd: integer('goal_difference').notNull().default(0), // Changed from text to integer
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
