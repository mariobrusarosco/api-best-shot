import { numeric, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Guess = pgTable(
  'guess',
  {
    id: uuid('id').notNull().defaultRandom(),
    memberId: uuid('member_id').notNull(),
    matchId: uuid('match_id').notNull(),
    homeScore: numeric('home_score'),
    awayScore: numeric('away_score'),
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
