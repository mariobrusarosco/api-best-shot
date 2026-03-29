import type { SlackNotificationPayload } from '@/core/slack';
import type {
  StandingsCreateReportUploadResult,
  StandingsCreateWorkflowStatus,
  TournamentStandingsCreateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { STANDINGS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

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

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyStandingsCreateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
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
  const summaryText = formatSummary(input.summary);

  return buildOperationSlackPayload({
    operationTitle: 'Standings Create',
    operationType: STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
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
