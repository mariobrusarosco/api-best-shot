import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { type SlackBlock, type SlackNotificationPayload, slackService } from '@/core/slack';
import type {
  TournamentUpdateReportUploadResult,
  TournamentUpdateSummary,
  TournamentUpdateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

const webhookUrl = process.env.SLACK_JOB_EXECUTIONS_WEBHOOK || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const notifyTournamentUpdateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentPublicId: string;
  tournamentLabel: string;
  status: TournamentUpdateWorkflowStatus;
  summary: TournamentUpdateSummary;
  reportUpload?: TournamentUpdateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildTournamentUpdateSlackPayload(input);

  try {
    await slackService.sendNotification(webhookUrl, payload);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'notifyTournamentUpdateExecution',
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      executionStatus: input.status,
    });
  }
};

const buildTournamentUpdateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentPublicId: string;
  tournamentLabel: string;
  status: TournamentUpdateWorkflowStatus;
  summary: TournamentUpdateSummary;
  reportUpload?: TournamentUpdateReportUploadResult;
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
        text: `${statusMeta.emoji} Tournament Update ${statusMeta.label}`,
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
          text: `*Operation:*\n${TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE}`,
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
        text: `Tournament Public ID: \`${input.tournamentPublicId}\``,
      },
      {
        type: 'mrkdwn',
        text: `Timestamp: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  blocks.push({ type: 'divider' });

  return {
    text: `${statusMeta.emoji} Tournament Update ${statusMeta.label} - ${input.tournamentLabel}`,
    username: 'Data Provider Bot',
    icon_emoji: ':robot_face:',
    blocks,
  };
};

const getStatusPresentation = (
  status: TournamentUpdateWorkflowStatus
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

const buildReportText = (reportUpload?: TournamentUpdateReportUploadResult): string => {
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

const formatSummary = (summary: TournamentUpdateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.updatedTournaments > 0) {
    parts.push(`${summary.updatedTournaments} tournament updated`);
  }

  if (summary.uploadedAssets > 0) {
    parts.push(`${summary.uploadedAssets} logo uploaded`);
  }

  return parts.join(', ');
};
