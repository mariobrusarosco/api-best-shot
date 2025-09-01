import { pgTable, uuid, text, timestamp, integer, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { T_Tournament } from '@/domains/tournament/schema';

// Enum for job types (prefixed to avoid conflicts)
export const dpJobTypeEnum = pgEnum('dp_job_type', ['standings_and_scores', 'new_knockout_rounds', 'daily_update']);

// Enum for schedule status (prefixed to avoid conflicts)
export const dpScheduleStatusEnum = pgEnum('dp_schedule_status', ['pending', 'scheduled', 'schedule_failed']);

// Enum for execution status (prefixed to avoid conflicts)
export const dpExecutionStatusEnum = pgEnum('dp_execution_status', [
  'not_triggered',
  'triggered',
  'executing',
  'execution_succeeded',
  'execution_failed',
]);

export const T_DataProviderJobs = pgTable(
  'data_provider_jobs',
  {
    // Identity
    id: uuid('id').defaultRandom().primaryKey(),

    // AWS Integration
    scheduleId: text('schedule_id').notNull().unique(), // Our generated ID
    scheduleArn: text('schedule_arn'), // AWS EventBridge ARN (null until AWS confirms)

    // Job Configuration
    jobType: dpJobTypeEnum('job_type').notNull(),
    duration: integer('duration_days').notNull(), // How many days to run
    cronExpression: text('cron_expression'), // Generated cron for AWS

    // Target Configuration
    targetLambdaArn: text('target_lambda_arn').notNull(),
    targetEndpoint: text('target_endpoint').notNull(), // e.g., '/api/v2/admin/standings'
    targetPayload: jsonb('target_payload'), // Full payload for Lambda

    // Relationships (nullable for daily_update jobs)
    tournamentId: uuid('tournament_id').references(() => T_Tournament.id),

    // Two-Phase Status Tracking
    scheduleStatus: dpScheduleStatusEnum('schedule_status').notNull().default('pending'),
    executionStatus: dpExecutionStatusEnum('execution_status').notNull().default('not_triggered'),

    // Scheduling Phase Timestamps
    scheduledAt: timestamp('scheduled_at'), // When we called AWS
    scheduleConfirmedAt: timestamp('schedule_confirmed_at'), // When AWS confirmed
    scheduleFailedAt: timestamp('schedule_failed_at'),
    scheduleErrorDetails: jsonb('schedule_error_details'),

    // Execution Phase Timestamps
    triggeredAt: timestamp('triggered_at'), // When EventBridge triggered
    executedAt: timestamp('executed_at'), // When Lambda started
    completedAt: timestamp('completed_at'), // When Lambda finished

    // Execution Details
    executionId: text('execution_id'), // AWS execution ID
    executionResult: jsonb('execution_result'), // Lambda response
    executionErrorDetails: jsonb('execution_error_details'),

    // Metadata
    environment: text('environment').notNull(), // 'demo' or 'production'
    createdBy: text('created_by').notNull(), // Admin user who created
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    // Indexes for efficient querying
    scheduleIdIdx: index('data_provider_jobs_schedule_id_idx').on(table.scheduleId),
    tournamentIdIdx: index('data_provider_jobs_tournament_id_idx').on(table.tournamentId),
    jobTypeIdx: index('data_provider_jobs_job_type_idx').on(table.jobType),
    scheduleStatusIdx: index('data_provider_jobs_schedule_status_idx').on(table.scheduleStatus),
    executionStatusIdx: index('data_provider_jobs_execution_status_idx').on(table.executionStatus),
    environmentIdx: index('data_provider_jobs_environment_idx').on(table.environment),
    createdAtIdx: index('data_provider_jobs_created_at_idx').on(table.createdAt),
  })
);

// Type exports
export type DB_SelectDataProviderJob = typeof T_DataProviderJobs.$inferSelect;
export type DB_InsertDataProviderJob = typeof T_DataProviderJobs.$inferInsert;
export type DB_UpdateDataProviderJob = Partial<typeof T_DataProviderJobs.$inferInsert>;

// Status type exports for use in application
export type JobType = 'standings_and_scores' | 'new_knockout_rounds' | 'daily_update';
export type ScheduleStatus = 'pending' | 'scheduled' | 'schedule_failed';
export type ExecutionStatus = 'not_triggered' | 'triggered' | 'executing' | 'execution_succeeded' | 'execution_failed';
