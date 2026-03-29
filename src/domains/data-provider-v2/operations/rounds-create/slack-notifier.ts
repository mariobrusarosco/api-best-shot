import type { SlackNotificationPayload } from '@/core/slack';
import type {
  RoundsCreateReportUploadResult,
  RoundsCreateWorkflowStatus,
  TournamentRoundsCreateSummary,
} from '@/domains/data-provider-v2/contracts/rounds';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { ROUNDS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyRoundsCreateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsCreateWorkflowStatus;
  summary: TournamentRoundsCreateSummary;
  reportUpload?: RoundsCreateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildRoundsCreateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyRoundsCreateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildRoundsCreateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsCreateWorkflowStatus;
  summary: TournamentRoundsCreateSummary;
  reportUpload?: RoundsCreateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  return buildOperationSlackPayload({
    operationTitle: 'Rounds Create',
    operationType: ROUNDS_CREATE_EXECUTION_OPERATION_TYPE,
    tournamentLabel: input.tournamentLabel,
    status: getStatusPresentation(input.status),
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
  status: RoundsCreateWorkflowStatus
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

const formatSummary = (summary: TournamentRoundsCreateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.createdRounds > 0) {
    parts.push(`${summary.createdRounds} rounds created`);
  }

  if (summary.skippedExistingRounds > 0) {
    parts.push(`${summary.skippedExistingRounds} already existed`);
  }

  return parts.join(', ');
};
