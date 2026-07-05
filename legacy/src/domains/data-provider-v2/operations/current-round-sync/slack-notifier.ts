import type { SlackNotificationPayload } from '@/core/slack';
import type {
  CurrentRoundSyncReportUploadResult,
  CurrentRoundSyncSummary,
  CurrentRoundSyncWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyCurrentRoundSyncExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  currentRoundSlug?: string;
  status: CurrentRoundSyncWorkflowStatus;
  summary: CurrentRoundSyncSummary;
  reportUpload?: CurrentRoundSyncReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildCurrentRoundSyncSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyCurrentRoundSyncExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildCurrentRoundSyncSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  currentRoundSlug?: string;
  status: CurrentRoundSyncWorkflowStatus;
  summary: CurrentRoundSyncSummary;
  reportUpload?: CurrentRoundSyncReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  return buildOperationSlackPayload({
    operationTitle: 'Tournament Current Round Sync',
    operationType: CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE,
    tournamentLabel: input.tournamentLabel,
    status: getStatusPresentation(input.status),
    summaryText: formatSummary(input.summary, input.currentRoundSlug),
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
  status: CurrentRoundSyncWorkflowStatus
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

const formatSummary = (summary: CurrentRoundSyncSummary, currentRoundSlug?: string): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.updatedTournaments > 0) {
    parts.push(`${summary.updatedTournaments} tournament updated`);
  }

  if (summary.fetchedRounds > 0) {
    parts.push(`${summary.fetchedRounds} rounds fetched`);
  }

  if (currentRoundSlug) {
    parts.push(`current round: ${currentRoundSlug}`);
  }

  return parts.join(', ');
};
