import { numeric, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Guess = pgTable(
  'guess',
  {
    id: uuid('id').defaultRandom(),
    memberId: uuid('member_id').notNull(),
    matchId: uuid('match_id').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    homeScore: numeric('home_score').notNull(),
    awayScore: numeric('away_score').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.matchId, table.memberId] }),
    };
  }
);

export type DB_SelectGuess = typeof T_Guess.$inferSelect;
export type DB_InsertGuess = typeof T_Guess.$inferInsert;
