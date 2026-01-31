import { T_Match } from '@/domains/match/schema';
import { T_Member } from '@/domains/member/schema';
import { boolean, index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const T_Guess = pgTable(
  'guess',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(), // ✅ Standard UUID PK
    memberId: uuid('member_id')
      .notNull()
      .references(() => T_Member.id, { onDelete: 'cascade' }), // ✅ FK with Cascade
    matchId: uuid('match_id')
      .notNull()
      .references(() => T_Match.id, { onDelete: 'cascade' }), // ✅ FK with Cascade
    roundId: integer('round_id').notNull().default(0), // ✅ Type Fix: text -> integer
    homeScore: integer('home_score'), // ✅ Type Fix: numeric -> integer
    active: boolean('active').notNull().default(true),
    awayScore: integer('away_score'), // ✅ Type Fix: numeric -> integer
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => {
    return {
      // ✅ Unique Constraint (formerly composite PK)
      uniqueGuess: uniqueIndex('unique_guess').on(table.matchId, table.memberId),
      // ✅ Performance Indexes
      memberIdx: index('guess_member_idx').on(table.memberId),
      matchIdx: index('guess_match_idx').on(table.matchId),
      activeIdx: index('guess_active_idx').on(table.active),
    };
  }
);

export type DB_SelectGuess = typeof T_Guess.$inferSelect;
export type DB_InsertGuess = typeof T_Guess.$inferInsert;
