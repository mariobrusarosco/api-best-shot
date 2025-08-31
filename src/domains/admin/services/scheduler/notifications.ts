import { env } from '@/config/env';
import type { JobType } from '@/domains/data-provider/schema/data-provider-jobs';
import { SlackMessage, SlackNotificationService } from '@/services/notifications/slack';
import Profiling from '@/services/profiling';

interface NotificationParams {
  status: 'pending' | 'scheduled' | 'schedule_failed' | 'execution_succeeded' | 'execution_failed';
  tournamentId: string;
  jobType: JobType;
  scheduleId: string;
  scheduleArn?: string;
  error?: string;
  executionResult?: Record<string, unknown>;
}

/**
 * Send Slack notification for schedule events
 */
export async function sendScheduleNotification(params: NotificationParams): Promise<void> {
  try {
    const webhookUrl = env.SLACK_WEBHOOK_JOB_SCHEDULE_URL;
    if (!webhookUrl) {
      Profiling.log({
        msg: 'SLACK NOTIFICATION - Webhook URL not configured, skipping',
        source: 'SCHEDULER_NOTIFICATIONS',
      });
      return;
    }

    const slack = new SlackNotificationService(webhookUrl);
    const message = buildSlackMessage(params);

    await slack.sendMessage(message);

    Profiling.log({
      msg: 'SLACK NOTIFICATION - Sent successfully',
      data: {
        status: params.status,
        scheduleId: params.scheduleId,
      },
      source: 'SCHEDULER_NOTIFICATIONS',
    });
  } catch (error) {
    // Don't throw - we don't want notification failures to break the flow
    Profiling.error({
      source: 'SCHEDULER_NOTIFICATIONS',
      error,
      data: params,
    });
  }
}

/**
 * Build Slack message based on notification type
 */
function buildSlackMessage(params: NotificationParams): SlackMessage {
  const jobTypeDisplay =
    params.jobType === 'standings_and_scores' ? 'Standings & Scores Update' : 'Knockout Rounds Update';

  const environment = env.NODE_ENV || 'development';
  const timestamp = new Date().toISOString();

  switch (params.status) {
    case 'pending':
      return {
        text: `🔄 Job Scheduling Initiated`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🔄 Job Scheduling Initiated*\n\nA new scheduled job is being created.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Job Type:*\n${jobTypeDisplay}`,
              },
              {
                type: 'mrkdwn',
                text: `*Tournament:*\n${params.tournamentId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Schedule ID:*\n${params.scheduleId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Environment:*\n${environment}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Timestamp: ${timestamp}`,
              },
            ],
          },
        ],
      };

    case 'scheduled':
      return {
        text: `✅ Job Scheduled Successfully`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*✅ Job Scheduled Successfully*\n\nThe job has been successfully scheduled in AWS EventBridge.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Job Type:*\n${jobTypeDisplay}`,
              },
              {
                type: 'mrkdwn',
                text: `*Tournament:*\n${params.tournamentId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Schedule ID:*\n${params.scheduleId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Environment:*\n${environment}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `AWS ARN: ${params.scheduleArn || 'N/A'}\nTimestamp: ${timestamp}`,
              },
            ],
          },
        ],
      };

    case 'schedule_failed':
      return {
        text: `❌ Job Scheduling Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*❌ Job Scheduling Failed*\n\nFailed to create schedule in AWS EventBridge.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Job Type:*\n${jobTypeDisplay}`,
              },
              {
                type: 'mrkdwn',
                text: `*Tournament:*\n${params.tournamentId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Schedule ID:*\n${params.scheduleId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Error:*\n${params.error || 'Unknown error'}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Environment: ${environment}\nTimestamp: ${timestamp}`,
              },
            ],
          },
        ],
      };

    case 'execution_succeeded':
      return {
        text: `✅ Job Executed Successfully`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*✅ Job Executed Successfully*\n\nThe scheduled job has completed successfully.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Job Type:*\n${jobTypeDisplay}`,
              },
              {
                type: 'mrkdwn',
                text: `*Tournament:*\n${params.tournamentId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Schedule ID:*\n${params.scheduleId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Environment:*\n${environment}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Timestamp: ${timestamp}`,
              },
            ],
          },
        ],
      };

    case 'execution_failed':
      return {
        text: `❌ Job Execution Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*❌ Job Execution Failed*\n\nThe scheduled job failed during execution.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Job Type:*\n${jobTypeDisplay}`,
              },
              {
                type: 'mrkdwn',
                text: `*Tournament:*\n${params.tournamentId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Schedule ID:*\n${params.scheduleId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Error:*\n${params.error || 'Unknown error'}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Environment: ${environment}\nTimestamp: ${timestamp}`,
              },
            ],
          },
        ],
      };

    default:
      return {
        text: `Schedule Event: ${params.status}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Schedule Event: ${params.status}*`,
            },
          },
        ],
      };
  }
}
