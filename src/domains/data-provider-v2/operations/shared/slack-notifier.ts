import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { type SlackBlock, type SlackNotificationPayload, slackService } from '@/core/slack';

const webhookUrl = process.env.SLACK_JOB_EXECUTIONS_WEBHOOK || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

type SharedReportUpload = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileUrl?: string;
};

type OperationStatusPresentation = {
  emoji: string;
  label: string;
};

type SlackContextField = {
  label: string;
  value: string;
};

export const sendOperationSlackNotification = async (input: {
  payload: SlackNotificationPayload;
  notifyOperation: string;
  requestId: string;
  tournamentId?: string | null;
  executionStatus: string;
}): Promise<void> => {
  try {
    await slackService.sendNotification(webhookUrl, input.payload);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: input.notifyOperation,
      requestId: input.requestId,
      tournamentId: input.tournamentId ?? undefined,
      executionStatus: input.executionStatus,
    });
  }
};

export const buildOperationSlackPayload = (input: {
  operationTitle: string;
  operationType: string;
  tournamentLabel: string;
  status: OperationStatusPresentation;
  summaryText?: string;
  reportUpload?: SharedReportUpload;
  errorMessage?: string;
  requestId: string;
  contextFields: SlackContextField[];
}): SlackNotificationPayload => {
  const reportText = buildReportText(input.reportUpload);
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${input.status.emoji} ${input.operationTitle} ${input.status.label}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Tournament:*\n${input.tournamentLabel}`,
        },
        {
          type: 'mrkdwn',
          text: `*Operation:*\n${input.operationType}`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${input.status.label}`,
        },
        {
          type: 'mrkdwn',
          text: `*Environment:*\n${formatEnvironmentLabel(NODE_ENV)}`,
        },
      ],
    },
  ];

  if (input.summaryText) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${input.summaryText}`,
      },
    });
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Report:*\n${reportText}`,
    },
  });

  if (input.errorMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error Details:*\n\`\`\`${input.errorMessage}\`\`\``,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Request ID: \`${input.requestId}\``,
      },
      ...input.contextFields.map(field => ({
        type: 'mrkdwn' as const,
        text: `${field.label}: \`${field.value}\``,
      })),
      {
        type: 'mrkdwn',
        text: `Timestamp: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  blocks.push({ type: 'divider' });

  return {
    text: `${input.status.emoji} ${input.operationTitle} ${input.status.label} - ${input.tournamentLabel}`,
    username: 'Data Provider Bot',
    icon_emoji: ':robot_face:',
    blocks,
  };
};

const buildReportText = (reportUpload?: SharedReportUpload): string => {
  if (!reportUpload) {
    return 'Report not attempted';
  }

  if (reportUpload.reportAvailable && reportUpload.reportFileUrl) {
    return `📊 <${reportUpload.reportFileUrl}|View Report>`;
  }

  if (reportUpload.reportUploadStatus === 'failed') {
    return 'Report unavailable';
  }

  return 'Report uploaded but public link unavailable';
};

const formatEnvironmentLabel = (environment: string): string => {
  return environment.trim().replace(/[-_]+/g, ' ').toUpperCase();
};
