import { SCOREBOARD_EXECUTION_STATUSES, type ScoreboardExecutionStatus } from '@/domains/scoreboard/contracts';
import { T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';
import { T_Member } from '@/domains/member/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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

export const T_ScoreboardExecutions = pgTable(
  'scoreboard_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id, { onDelete: 'cascade' }),
    operationType: text('operation_type').notNull(),
    status: text('status', {
      enum: Object.values(SCOREBOARD_EXECUTION_STATUSES) as [ScoreboardExecutionStatus, ...ScoreboardExecutionStatus[]],
    }).notNull(),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    duration: integer('duration'),
    reportFileUrl: text('report_file_url'),
    reportFileKey: text('report_file_key'),
    summary: jsonb('summary'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    tournamentIdx: index('scoreboard_executions_tournament_idx').on(table.tournamentId),
    operationTypeIdx: index('scoreboard_executions_operation_type_idx').on(table.operationType),
    statusIdx: index('scoreboard_executions_status_idx').on(table.status),
    startedAtIdx: index('scoreboard_executions_started_at_idx').on(table.startedAt),
    requestIdIdx: index('scoreboard_executions_request_id_idx').on(table.requestId),
    uniqueInProgressTournamentOperation: uniqueIndex('scoreboard_executions_in_progress_tournament_operation_idx')
      .on(table.tournamentId, table.operationType)
      .where(sql`${table.status} = 'in_progress'`),
  })
);

export type DB_InsertScoreboardExecution = typeof T_ScoreboardExecutions.$inferInsert;
export type DB_UpdateScoreboardExecution = typeof T_ScoreboardExecutions.$inferInsert;
export type DB_SelectScoreboardExecution = typeof T_ScoreboardExecutions.$inferSelect;
