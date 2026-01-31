import { T_Tournament } from '@/domains/tournament/schema';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const T_TournamentRound = pgTable(
  'tournament_round',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }), // FK with cascade delete
    order: integer('order').notNull(),
    label: text('label').notNull(),
    slug: text('slug').notNull(),
    knockoutId: text('knockout_id').default(''),
    prefix: text('prefix').default(''),
    providerUrl: text('provider_url').notNull(),
    providerId: text('provider_id').notNull(),
    type: text('type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      uniqueTournamentSlug: uniqueIndex('tournament_round_tournament_slug_idx').on(table.tournamentId, table.slug), // Composite unique constraint
    };
  }
);

export type DB_InsertTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_UpdateTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_SelectTournamentRound = typeof T_TournamentRound.$inferSelect;
