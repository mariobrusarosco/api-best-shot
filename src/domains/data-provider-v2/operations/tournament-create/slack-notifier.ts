import type { SlackNotificationPayload } from '@/core/slack';
import type {
  TournamentCreateReportUploadResult,
  TournamentCreateSummary,
  TournamentCreateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

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

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyTournamentCreateExecution',
    requestId: input.requestId,
    tournamentId: input.createdTournamentId,
    executionStatus: input.status,
  });
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
  const summaryText = formatSummary(input.summary);

  return buildOperationSlackPayload({
    operationTitle: 'Tournament Create',
    operationType: TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE,
    tournamentLabel: input.tournamentLabel,
    status: statusMeta,
    summaryText,
    reportUpload: input.reportUpload,
    errorMessage: input.status === 'failed' ? input.errorMessage : undefined,
    requestId: input.requestId,
    contextFields: [
      {
        label: 'Tournament Public ID',
        value: input.tournamentPublicId,
      },
      {
        label: 'Tournament ID',
        value: input.createdTournamentId ?? 'not-created',
      },
    ],
  });
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
