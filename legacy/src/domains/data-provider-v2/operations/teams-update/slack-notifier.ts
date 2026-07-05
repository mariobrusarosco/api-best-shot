import type { SlackNotificationPayload } from '@/core/slack';
import type {
  TeamsUpdateReportUploadResult,
  TeamsUpdateWorkflowStatus,
  TournamentTeamsUpdateSummary,
} from '@/domains/data-provider-v2/contracts/teams';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { TEAMS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyTeamsUpdateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsUpdateWorkflowStatus;
  summary: TournamentTeamsUpdateSummary;
  reportUpload?: TeamsUpdateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildTeamsUpdateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyTeamsUpdateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildTeamsUpdateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsUpdateWorkflowStatus;
  summary: TournamentTeamsUpdateSummary;
  reportUpload?: TeamsUpdateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);

  return buildOperationSlackPayload({
    operationTitle: 'Teams Update',
    operationType: TEAMS_UPDATE_EXECUTION_OPERATION_TYPE,
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
  status: TeamsUpdateWorkflowStatus
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

const formatSummary = (summary: TournamentTeamsUpdateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.upsertedTeams > 0) {
    parts.push(`${summary.upsertedTeams} teams upserted`);
  }

  if (summary.updatedTeams > 0) {
    parts.push(`${summary.updatedTeams} updated`);
  }

  if (summary.createdTeams > 0) {
    parts.push(`${summary.createdTeams} created during update`);
  }

  if (summary.uploadedAssets > 0) {
    parts.push(`${summary.uploadedAssets} badges uploaded`);
  }

  return parts.join(', ');
};
