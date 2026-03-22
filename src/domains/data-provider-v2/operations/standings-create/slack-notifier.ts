import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { type SlackBlock, type SlackNotificationPayload, slackService } from '@/core/slack';
import type {
  StandingsCreateReportUploadResult,
  StandingsCreateWorkflowStatus,
  TournamentStandingsCreateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import { STANDINGS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

const webhookUrl = process.env.SLACK_JOB_EXECUTIONS_WEBHOOK || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const notifyStandingsCreateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsCreateWorkflowStatus;
  summary: TournamentStandingsCreateSummary;
  reportUpload?: StandingsCreateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildStandingsCreateSlackPayload(input);

  try {
    await slackService.sendNotification(webhookUrl, payload);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'notifyStandingsCreateExecution',
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      executionStatus: input.status,
    });
  }
};

export const buildStandingsCreateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsCreateWorkflowStatus;
  summary: TournamentStandingsCreateSummary;
  reportUpload?: StandingsCreateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);
  const reportText = buildReportText(input.reportUpload);
  const summaryText = formatSummary(input.summary);

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusMeta.emoji} Standings Create ${statusMeta.label}`,
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
          text: `*Operation:*\n${STANDINGS_CREATE_EXECUTION_OPERATION_TYPE}`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${statusMeta.label}`,
        },
        {
          type: 'mrkdwn',
          text: `*Environment:*\n${formatEnvironmentLabel(NODE_ENV)}`,
        },
      ],
    },
  ];

  if (summaryText) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${summaryText}`,
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

  if (input.status === 'failed' && input.errorMessage) {
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
      {
        type: 'mrkdwn',
        text: `Tournament ID: \`${input.tournamentId}\``,
      },
      {
        type: 'mrkdwn',
        text: `Timestamp: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  blocks.push({ type: 'divider' });

  return {
    text: `${statusMeta.emoji} Standings Create ${statusMeta.label} - ${input.tournamentLabel}`,
    username: 'Data Provider Bot',
    icon_emoji: ':robot_face:',
    blocks,
  };
};

const getStatusPresentation = (
  status: StandingsCreateWorkflowStatus
): {
  emoji: string;
  label: string;
} => {
  switch (status) {
    case 'completed':
      return {
        emoji: '✅',
        label: 'COMPLETED',
      };
    case 'partial_failure':
      return {
        emoji: '⚠️',
        label: 'PARTIAL FAILURE',
      };
    case 'failed':
      return {
        emoji: '❌',
        label: 'FAILED',
      };
  }
};

const buildReportText = (reportUpload?: StandingsCreateReportUploadResult): string => {
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

const formatSummary = (summary: TournamentStandingsCreateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.createdRows > 0) {
    parts.push(`${summary.createdRows} created`);
  }

  if (summary.missingTeamsCount > 0) {
    parts.push(`${summary.missingTeamsCount} missing teams`);
  }

  if (summary.providerMissingStandingsCount > 0) {
    parts.push(`${summary.providerMissingStandingsCount} missing standings payload`);
  }

  return parts.join(', ');
};
