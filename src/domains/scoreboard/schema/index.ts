import { T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';
import { T_Member } from '@/domains/member/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const T_ScoreboardLedger = pgTable(
  'scoreboard_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => T_Match.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => T_Member.id, { onDelete: 'cascade' }),
    guessId: uuid('guess_id')
      .notNull()
      .references(() => T_Guess.id, { onDelete: 'cascade' }),
    pointsEarned: integer('points_earned').notNull(),
    ruleVersion: integer('rule_version').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    uniqueMatchMemberRuleVersion: uniqueIndex('scoreboard_ledger_match_member_rule_version_idx').on(
      table.matchId,
      table.memberId,
      table.ruleVersion
    ),
    tournamentIdx: index('scoreboard_ledger_tournament_idx').on(table.tournamentId),
    memberIdx: index('scoreboard_ledger_member_idx').on(table.memberId),
    matchIdx: index('scoreboard_ledger_match_idx').on(table.matchId),
    guessIdx: index('scoreboard_ledger_guess_idx').on(table.guessId),
  })
);

export type DB_InsertScoreboardLedger = typeof T_ScoreboardLedger.$inferInsert;
export type DB_UpdateScoreboardLedger = typeof T_ScoreboardLedger.$inferInsert;
export type DB_SelectScoreboardLedger = typeof T_ScoreboardLedger.$inferSelect;
