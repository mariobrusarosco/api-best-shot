import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const T_DataProviderExecutions = pgTable(
  'data_provider_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    operationType: text('operation_type').notNull(), // standings_create, standings_update, rounds_create, etc.
    status: text('status').notNull(), // in_progress, completed, failed
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    duration: integer('duration'), // Duration in milliseconds
    reportFileUrl: text('report_file_url'), // S3 URL to the operation report JSON file
    reportFileKey: text('report_file_key'), // S3 key for the operation report file
    summary: jsonb('summary'), // High-level stats from operation report summary
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    // Indexes for efficient querying
    tournamentIdIdx: index('data_provider_executions_tournament_id_idx').on(
      table.tournamentId
    ),
    operationTypeIdx: index('data_provider_executions_operation_type_idx').on(
      table.operationType
    ),
    statusIdx: index('data_provider_executions_status_idx').on(table.status),
    startedAtIdx: index('data_provider_executions_started_at_idx').on(table.startedAt),
    requestIdIdx: index('data_provider_executions_request_id_idx').on(table.requestId),
  })
);

export type DB_SelectDataProviderExecution = typeof T_DataProviderExecutions.$inferSelect;
export type DB_InsertDataProviderExecution = typeof T_DataProviderExecutions.$inferInsert;
export type DB_UpdateDataProviderExecution = typeof T_DataProviderExecutions.$inferInsert;