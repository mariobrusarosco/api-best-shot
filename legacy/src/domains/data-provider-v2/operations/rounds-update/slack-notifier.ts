import type { SlackNotificationPayload } from '@/core/slack';
import type {
  RoundsUpdateReportUploadResult,
  RoundsUpdateWorkflowStatus,
  TournamentRoundsUpdateSummary,
} from '@/domains/data-provider-v2/contracts/rounds';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyRoundsUpdateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsUpdateWorkflowStatus;
  summary: TournamentRoundsUpdateSummary;
  reportUpload?: RoundsUpdateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildRoundsUpdateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyRoundsUpdateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildRoundsUpdateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsUpdateWorkflowStatus;
  summary: TournamentRoundsUpdateSummary;
  reportUpload?: RoundsUpdateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  return buildOperationSlackPayload({
    operationTitle: 'Rounds Update',
    operationType: ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE,
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
  status: RoundsUpdateWorkflowStatus
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

const formatSummary = (summary: TournamentRoundsUpdateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.upsertedRounds > 0) {
    parts.push(`${summary.upsertedRounds} rounds upserted`);
  }

  if (summary.createdRounds > 0) {
    parts.push(`${summary.createdRounds} created`);
  }

  if (summary.updatedRounds > 0) {
    parts.push(`${summary.updatedRounds} updated`);
  }

  return parts.join(', ');
};
