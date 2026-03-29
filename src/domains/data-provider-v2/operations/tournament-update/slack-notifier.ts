import type { SlackNotificationPayload } from '@/core/slack';
import type {
  TournamentUpdateReportUploadResult,
  TournamentUpdateSummary,
  TournamentUpdateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

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

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyTournamentUpdateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
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
  const summaryText = formatSummary(input.summary);

  return buildOperationSlackPayload({
    operationTitle: 'Tournament Update',
    operationType: TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE,
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
      {
        label: 'Tournament Public ID',
        value: input.tournamentPublicId,
      },
    ],
  });
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
