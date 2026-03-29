import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { type SlackBlock, type SlackNotificationPayload, slackService } from '@/core/slack';
import type {
  TournamentCreateReportUploadResult,
  TournamentCreateSummary,
  TournamentCreateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

const webhookUrl = process.env.SLACK_JOB_EXECUTIONS_WEBHOOK || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const notifyTournamentCreateExecution = async (input: {
  requestId: string;
  tournamentPublicId: string;
  createdTournamentId?: string;
  tournamentLabel: string;
  status: TournamentCreateWorkflowStatus;
  summary: TournamentCreateSummary;
  reportUpload?: TournamentCreateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildTournamentCreateSlackPayload(input);

  try {
    await slackService.sendNotification(webhookUrl, payload);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'notifyTournamentCreateExecution',
      requestId: input.requestId,
      tournamentId: input.createdTournamentId,
      executionStatus: input.status,
    });
  }
};

const buildTournamentCreateSlackPayload = (input: {
  requestId: string;
  tournamentPublicId: string;
  createdTournamentId?: string;
  tournamentLabel: string;
  status: TournamentCreateWorkflowStatus;
  summary: TournamentCreateSummary;
  reportUpload?: TournamentCreateReportUploadResult;
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
        text: `${statusMeta.emoji} Tournament Create ${statusMeta.label}`,
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
          text: `*Operation:*\n${TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE}`,
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
        text: `Tournament Public ID: \`${input.tournamentPublicId}\``,
      },
      {
        type: 'mrkdwn',
        text: `Tournament ID: \`${input.createdTournamentId ?? 'not-created'}\``,
      },
      {
        type: 'mrkdwn',
        text: `Timestamp: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  blocks.push({ type: 'divider' });

  return {
    text: `${statusMeta.emoji} Tournament Create ${statusMeta.label} - ${input.tournamentLabel}`,
    username: 'Data Provider Bot',
    icon_emoji: ':robot_face:',
    blocks,
  };
};

const getStatusPresentation = (
  status: TournamentCreateWorkflowStatus
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
    case 'failed':
      return {
        emoji: '❌',
        label: 'FAILED',
      };
  }
};

const buildReportText = (reportUpload?: TournamentCreateReportUploadResult): string => {
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

const formatSummary = (summary: TournamentCreateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.createdTournaments > 0) {
    parts.push(`${summary.createdTournaments} tournament created`);
  }

  if (summary.uploadedAssets > 0) {
    parts.push(`${summary.uploadedAssets} logo uploaded`);
  }

  return parts.join(', ');
};
