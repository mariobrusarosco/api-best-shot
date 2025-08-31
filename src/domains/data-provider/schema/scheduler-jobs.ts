import { pgTable, uuid, text, timestamp, integer, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { T_Tournament } from '@/domains/tournament/schema';

// Enum for schedule types
export const scheduleTypeEnum = pgEnum('schedule_type', ['scores_and_standings', 'knockouts_update']);

// Enum for job status
export const scheduleStatusEnum = pgEnum('schedule_status', [
  'pending',
  'scheduled',
  'triggered',
  'executing',
  'completed',
  'failed',
  'cancelled',
]);

export const T_SchedulerJobs = pgTable(
  'scheduler_jobs',
  {
    // Identity & AWS Integration
    id: uuid('id').defaultRandom().primaryKey(),
    scheduleId: text('schedule_id').notNull().unique(), // AWS Schedule ID
    scheduleArn: text('schedule_arn'), // AWS EventBridge Schedule ARN

    // Schedule Configuration
    scheduleType: scheduleTypeEnum('schedule_type').notNull(),
    cronExpression: text('cron_expression'), // AWS cron format
    targetLambdaArn: text('target_lambda_arn'),
    targetInput: jsonb('target_input'), // Input payload for Lambda

    // Relationships
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => T_Tournament.id),
    matchId: uuid('match_id'), // Nullable for match-specific schedules (no FK due to composite PK in match table)
    matchExternalId: text('match_external_id'), // Store external ID for reference
    matchProvider: text('match_provider'), // Store provider for reference
    roundSlug: text('round_slug'),

    // Lifecycle Tracking
    status: scheduleStatusEnum('status').notNull().default('pending'),
    scheduledAt: timestamp('scheduled_at'), // When schedule was created in AWS
    triggeredAt: timestamp('triggered_at'), // When EventBridge triggered the schedule
    executedAt: timestamp('executed_at'), // When Lambda started execution
    completedAt: timestamp('completed_at'), // When Lambda finished

    // Execution Details
    executionId: text('execution_id'), // AWS execution ID
    executionStatus: text('execution_status'), // AWS response status
    executionError: jsonb('execution_error'), // Error details if failed
    retryCount: integer('retry_count').default(0).notNull(),
    lastRetryAt: timestamp('last_retry_at'),

    // Metadata
    environment: text('environment').notNull(), // 'demo' or 'production'
    createdBy: text('created_by').default('system').notNull(), // System/user that created the schedule
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    // Indexes for efficient querying
    scheduleIdIdx: index('scheduler_jobs_schedule_id_idx').on(table.scheduleId),
    tournamentIdIdx: index('scheduler_jobs_tournament_id_idx').on(table.tournamentId),
    matchIdIdx: index('scheduler_jobs_match_id_idx').on(table.matchId),
    matchExternalIdIdx: index('scheduler_jobs_match_external_id_idx').on(table.matchExternalId),
    statusIdx: index('scheduler_jobs_status_idx').on(table.status),
    scheduledAtIdx: index('scheduler_jobs_scheduled_at_idx').on(table.scheduledAt),
    scheduleTypeIdx: index('scheduler_jobs_schedule_type_idx').on(table.scheduleType),
    environmentIdx: index('scheduler_jobs_environment_idx').on(table.environment),
  })
);

// Type exports
export type DB_SelectSchedulerJob = typeof T_SchedulerJobs.$inferSelect;
export type DB_InsertSchedulerJob = typeof T_SchedulerJobs.$inferInsert;
export type DB_UpdateSchedulerJob = Partial<typeof T_SchedulerJobs.$inferInsert>;

// Status type export for use in application
export type SchedulerJobStatus =
  | 'pending'
  | 'scheduled'
  | 'triggered'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type SchedulerJobType = 'scores_and_standings' | 'knockouts_update';
