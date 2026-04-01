import type { SlackNotificationPayload } from '@/core/slack';
import type {
  MatchesCreateReportUploadResult,
  MatchesCreateWorkflowStatus,
  TournamentMatchesCreateSummary,
} from '@/domains/data-provider-v2/contracts/matches';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { MATCHES_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyMatchesCreateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesCreateWorkflowStatus;
  summary: TournamentMatchesCreateSummary;
  reportUpload?: MatchesCreateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildMatchesCreateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyMatchesCreateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildMatchesCreateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesCreateWorkflowStatus;
  summary: TournamentMatchesCreateSummary;
  reportUpload?: MatchesCreateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);

  return buildOperationSlackPayload({
    operationTitle: 'Matches Create',
    operationType: MATCHES_CREATE_EXECUTION_OPERATION_TYPE,
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
  status: MatchesCreateWorkflowStatus
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

const formatSummary = (summary: TournamentMatchesCreateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.createdMatches > 0) {
    parts.push(`${summary.createdMatches} matches created`);
  }

  if (summary.skippedExistingMatches > 0) {
    parts.push(`${summary.skippedExistingMatches} already existed`);
  }

  if (summary.blockedByMissingTeamsCount > 0) {
    parts.push(`${summary.blockedByMissingTeamsCount} blocked by missing teams`);
  }

  return parts.join(', ');
};
