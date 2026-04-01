import type { SlackNotificationPayload } from '@/core/slack';
import type {
  MatchesUpdateReportUploadResult,
  MatchesUpdateWorkflowStatus,
  TournamentMatchesUpdateSummary,
} from '@/domains/data-provider-v2/contracts/matches';
import {
  buildOperationSlackPayload,
  sendOperationSlackNotification,
} from '@/domains/data-provider-v2/operations/shared/slack-notifier';
import { MATCHES_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const notifyMatchesUpdateExecution = async (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesUpdateWorkflowStatus;
  summary: TournamentMatchesUpdateSummary;
  reportUpload?: MatchesUpdateReportUploadResult;
  errorMessage?: string;
}): Promise<void> => {
  const payload = buildMatchesUpdateSlackPayload(input);

  await sendOperationSlackNotification({
    payload,
    notifyOperation: 'notifyMatchesUpdateExecution',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionStatus: input.status,
  });
};

const buildMatchesUpdateSlackPayload = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesUpdateWorkflowStatus;
  summary: TournamentMatchesUpdateSummary;
  reportUpload?: MatchesUpdateReportUploadResult;
  errorMessage?: string;
}): SlackNotificationPayload => {
  const statusMeta = getStatusPresentation(input.status);

  return buildOperationSlackPayload({
    operationTitle: 'Matches Update',
    operationType: MATCHES_UPDATE_EXECUTION_OPERATION_TYPE,
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
  status: MatchesUpdateWorkflowStatus
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

const formatSummary = (summary: TournamentMatchesUpdateSummary): string => {
  const parts: string[] = [];

  parts.push(`${summary.successfulOperations} successful`);

  if (summary.failedOperations > 0) {
    parts.push(`${summary.failedOperations} failed`);
  }

  if (summary.upsertedMatches > 0) {
    parts.push(`${summary.upsertedMatches} matches upserted`);
  }

  if (summary.createdMatches > 0) {
    parts.push(`${summary.createdMatches} created`);
  }

  if (summary.updatedMatches > 0) {
    parts.push(`${summary.updatedMatches} updated`);
  }

  if (summary.blockedByMissingTeamsCount > 0) {
    parts.push(`${summary.blockedByMissingTeamsCount} blocked by missing teams`);
  }

  return parts.join(', ');
};
