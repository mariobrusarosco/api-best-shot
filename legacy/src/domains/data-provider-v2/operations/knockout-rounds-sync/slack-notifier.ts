import type { SlackNotificationPayload } from '@/core/slack';
import type {
  KnockoutRoundsSyncReportUploadResult,
  KnockoutRoundsSyncSummary,
  KnockoutRoundsSyncWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyKnockoutRoundsSyncExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: KnockoutRoundsSyncWorkflowStatus;
  summary: KnockoutRoundsSyncSummary;
  reportUpload?: KnockoutRoundsSyncReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildKnockoutRoundsSyncSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyKnockoutRoundsSyncExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildKnockoutRoundsSyncSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: KnockoutRoundsSyncWorkflowStatus;
  summary: KnockoutRoundsSyncSummary;
  reportUpload?: KnockoutRoundsSyncReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  return buildOperationSlackPayload({
    operationTitle: 'Tournament Knockout Rounds Sync',
    operationType: KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE,
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

const getStatusPresentation = (status: KnockoutRoundsSyncWorkflowStatus): { emoji: string; label: string } => {
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

const formatSummary = (summary: KnockoutRoundsSyncSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.newKnockoutRoundCandidates} new knockout round candidates`);

  if (summary.readyKnockoutRounds > 0) {
    parts.push(`${summary.readyKnockoutRounds} ready rounds`);
  }

  if (summary.createdRounds > 0) {
    parts.push(`${summary.createdRounds} rounds created`);
  }

  if (summary.createdMatches > 0) {
    parts.push(`${summary.createdMatches} matches created`);
  }

  if (summary.roundsAwaitingAvailabilityCount > 0) {
    parts.push(`${summary.roundsAwaitingAvailabilityCount} waiting availability`);
  }

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  return parts.join(', ');
};
