import type { SlackNotificationPayload } from '@/core/slack';
import type {
  StandingsUpdateReportUploadResult,
  StandingsUpdateWorkflowStatus,
  TournamentStandingsUpdateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyStandingsUpdateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsUpdateWorkflowStatus;
  summary: TournamentStandingsUpdateSummary;
  reportUpload?: StandingsUpdateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildStandingsUpdateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyStandingsUpdateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

export const buildStandingsUpdateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsUpdateWorkflowStatus;
  summary: TournamentStandingsUpdateSummary;
  reportUpload?: StandingsUpdateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);
  const summaryText = formatSummary(input.summary);

  return buildOperationSlackPayload({
    operationTitle: 'Standings Update',
    operationType: STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE,
    tournamentLabel: input.tournamentLabel,
    status: statusMeta,
    summaryText,
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
  status: StandingsUpdateWorkflowStatus
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

const formatSummary = (summary: TournamentStandingsUpdateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.updatedRows > 0) {
    parts.push(`${summary.updatedRows} updated`);
  }

  if (summary.missingTeamsCount > 0) {
    parts.push(`${summary.missingTeamsCount} missing teams`);
  }

  if (summary.providerMissingStandingsCount > 0) {
    parts.push(`${summary.providerMissingStandingsCount} missing standings payload`);
  }

  return parts.join(', ');
};
