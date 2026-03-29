import type { SlackNotificationPayload } from '@/core/slack';
import type {
  TeamsCreateReportUploadResult,
  TeamsCreateWorkflowStatus,
  TournamentTeamsCreateSummary,
} from '@/domains/data-provider-v2/contracts/teams';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { TEAMS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyTeamsCreateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsCreateWorkflowStatus;
  summary: TournamentTeamsCreateSummary;
  reportUpload?: TeamsCreateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildTeamsCreateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyTeamsCreateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildTeamsCreateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsCreateWorkflowStatus;
  summary: TournamentTeamsCreateSummary;
  reportUpload?: TeamsCreateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);

  return buildOperationSlackPayload({
    operationTitle: 'Teams Create',
    operationType: TEAMS_CREATE_EXECUTION_OPERATION_TYPE,
    tournamentLabel: input.tournamentLabel,
    status: statusMeta,
    summaryText: formatSummary(input.summary),
    reportUpload: input.reportUpload,
    errorMessage: input.status === 'failed' ? input.errorMessage : undefined,
    requestId: input.requestId,
    contextFields: [
      {
        label: 'Tournament ID',
        value: input.tournamentId,
      },
    ],
  });
};

const getStatusPresentation = (
  status: TeamsCreateWorkflowStatus
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

const formatSummary = (summary: TournamentTeamsCreateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.createdTeams > 0) {
    parts.push(`${summary.createdTeams} teams created`);
  }

  if (summary.skippedExistingTeams > 0) {
    parts.push(`${summary.skippedExistingTeams} already existed`);
  }

  if (summary.uploadedAssets > 0) {
    parts.push(`${summary.uploadedAssets} badges uploaded`);
  }

  return parts.join(', ');
};
