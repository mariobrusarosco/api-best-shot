import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_TournamentRound = pgTable(
  'tournament_round',
  {
    id: uuid('id').defaultRandom(),
    tournamentId: text('tournament_id').notNull(),
    order: text('order').notNull(),
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
      pk: primaryKey({
        columns: [table.tournamentId, table.slug],
      }),
    };
  }
);

export type DB_InsertTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_UpdateTournamentRound = typeof T_TournamentRound.$inferInsert;
export type DB_SelectTournamentRound = typeof T_TournamentRound.$inferSelect;
