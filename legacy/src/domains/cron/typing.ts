export const CRON_JOB_DEFINITION_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  RETIRED: 'retired',
} as const;

export type ICronJobDefinitionStatus = (typeof CRON_JOB_DEFINITION_STATUSES)[keyof typeof CRON_JOB_DEFINITION_STATUSES];

export const CRON_JOB_SCHEDULE_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
} as const;

export type ICronJobScheduleType = (typeof CRON_JOB_SCHEDULE_TYPES)[keyof typeof CRON_JOB_SCHEDULE_TYPES];

export const CRON_RUN_TRIGGER_TYPES = {
  SCHEDULED: 'scheduled',
  MANUAL: 'manual',
  AD_HOC: 'ad_hoc',
} as const;

export type ICronRunTriggerType = (typeof CRON_RUN_TRIGGER_TYPES)[keyof typeof CRON_RUN_TRIGGER_TYPES];

export const CRON_RUN_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
  SKIPPED: 'skipped',
} as const;

export type ICronRunStatus = (typeof CRON_RUN_STATUSES)[keyof typeof CRON_RUN_STATUSES];
