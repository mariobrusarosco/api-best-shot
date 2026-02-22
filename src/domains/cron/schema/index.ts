import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CRON_JOB_DEFINITION_STATUSES, CRON_JOB_SCHEDULE_TYPES } from '@/domains/cron/typing';

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
