import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import {
  CRON_JOB_DEFINITION_STATUSES,
  CRON_JOB_SCHEDULE_TYPES,
  CRON_RUN_STATUSES,
  CRON_RUN_TRIGGER_TYPES,
} from '@/domains/cron/typing';

export const T_CronJobDefinitions = pgTable(
  'cron_job_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobKey: text('job_key').notNull(),
    version: integer('version').notNull().default(1),
    target: text('target').notNull(),
    payload: jsonb('payload'),
    scheduleType: text('schedule_type', {
      enum: Object.values(CRON_JOB_SCHEDULE_TYPES) as [string, ...string[]],
    }).notNull(),
    cronExpression: text('cron_expression'),
    runAt: timestamp('run_at'),
    timezone: text('timezone').notNull().default('UTC'),
    status: text('status', {
      enum: Object.values(CRON_JOB_DEFINITION_STATUSES) as [string, ...string[]],
    })
      .notNull()
      .default('active'),
    pauseReason: text('pause_reason'),
    supersedesJobId: uuid('supersedes_job_id'),
    createdBy: text('created_by').notNull().default('system'),
    updatedBy: text('updated_by').notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueJobVersion: uniqueIndex('cron_job_definitions_job_key_version_idx').on(table.jobKey, table.version),
    statusIdx: index('cron_job_definitions_status_idx').on(table.status),
    targetIdx: index('cron_job_definitions_target_idx').on(table.target),
    scheduleTypeIdx: index('cron_job_definitions_schedule_type_idx').on(table.scheduleType),
    oneTimeShape: check(
      'cron_job_definitions_one_time_shape_ck',
      sql`(${table.scheduleType} != 'one_time') OR (${table.runAt} IS NOT NULL AND ${table.cronExpression} IS NULL)`
    ),
    recurringShape: check(
      'cron_job_definitions_recurring_shape_ck',
      sql`(${table.scheduleType} != 'recurring') OR (${table.cronExpression} IS NOT NULL AND ${table.runAt} IS NULL)`
    ),
  })
);

export type DB_InsertCronJobDefinition = typeof T_CronJobDefinitions.$inferInsert;
export type DB_UpdateCronJobDefinition = typeof T_CronJobDefinitions.$inferInsert;
export type DB_SelectCronJobDefinition = typeof T_CronJobDefinitions.$inferSelect;

export const T_CronJobRuns = pgTable(
  'cron_job_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobDefinitionId: uuid('job_definition_id')
      .notNull()
      .references(() => T_CronJobDefinitions.id, { onDelete: 'restrict' }),
    jobKey: text('job_key').notNull(),
    jobVersion: integer('job_version').notNull(),
    target: text('target').notNull(),
    payloadSnapshot: jsonb('payload_snapshot'),
    triggerType: text('trigger_type', {
      enum: Object.values(CRON_RUN_TRIGGER_TYPES) as [string, ...string[]],
    }).notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    status: text('status', {
      enum: Object.values(CRON_RUN_STATUSES) as [string, ...string[]],
    })
      .notNull()
      .default('pending'),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    failureDetails: jsonb('failure_details'),
    runnerInstanceId: text('runner_instance_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    statusScheduledAtIdx: index('cron_job_runs_status_scheduled_at_idx').on(table.status, table.scheduledAt),
    jobDefinitionIdIdx: index('cron_job_runs_job_definition_id_idx').on(table.jobDefinitionId),
    jobKeyVersionIdx: index('cron_job_runs_job_key_job_version_idx').on(table.jobKey, table.jobVersion),
    targetIdx: index('cron_job_runs_target_idx').on(table.target),
    createdAtIdx: index('cron_job_runs_created_at_idx').on(table.createdAt),
    uniqueScheduledRun: uniqueIndex('cron_job_runs_scheduled_run_unique_idx').on(
      table.jobDefinitionId,
      table.scheduledAt,
      table.triggerType
    ),
  })
);

export type DB_InsertCronJobRun = typeof T_CronJobRuns.$inferInsert;
export type DB_UpdateCronJobRun = typeof T_CronJobRuns.$inferInsert;
export type DB_SelectCronJobRun = typeof T_CronJobRuns.$inferSelect;
