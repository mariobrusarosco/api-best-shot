import type {
  CurrentRoundSyncDetails,
  CurrentRoundSyncReport,
  CurrentRoundSyncReportData,
  CurrentRoundSyncReportUploadResult,
  CurrentRoundSyncSummary,
  CurrentRoundSyncWorkflowStatus,
  TournamentCurrentRoundSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import { CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildCurrentRoundSyncSummary = (
  result: TournamentCurrentRoundSyncWorkflowResult
): CurrentRoundSyncSummary => {
  switch (result.outcome) {
    case 'updated':
      return {
        totalOperations: 1,
        successfulOperations: 1,
        failedOperations: 0,
        fetchedRounds: result.fetchedRounds,
        updatedTournaments: 1,
        providerIssuesCount: result.providerIssues.length,
      };
    case 'invalid_input':
    case 'provider_response_missing_current_round':
    case 'database_update_failed':
    case 'unexpected_failure':
      return {
        totalOperations: 1,
        successfulOperations: 0,
        failedOperations: 1,
        fetchedRounds: result.fetchedRounds,
        updatedTournaments: 0,
        providerIssuesCount: result.providerIssues.length,
      };
  }
};

export const mergeCurrentRoundSyncSummaryWithReportUpload = (input: {
  summary: CurrentRoundSyncSummary;
  reportUpload: CurrentRoundSyncReportUploadResult;
}): CurrentRoundSyncSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildCurrentRoundSyncDetails = (
  result: TournamentCurrentRoundSyncWorkflowResult
): CurrentRoundSyncDetails => {
  return {
    updated:
      result.outcome === 'updated'
        ? [
            {
              tournamentId: result.tournament.tournamentId,
              tournamentSlug: result.tournament.tournamentSlug,
              previousCurrentRound: result.tournament.previousCurrentRound ?? null,
              currentRoundSlug: result.currentRoundSlug,
              fetchedRounds: result.fetchedRounds,
              requestUrl: result.requestUrl,
              reason: 'updated',
            },
          ]
        : [],
    invalidInput:
      result.outcome === 'invalid_input'
        ? result.invalidInput.map(issue => ({
            tournamentId: result.tournament.tournamentId,
            tournamentSlug: result.tournament.tournamentSlug,
            previousCurrentRound: result.tournament.previousCurrentRound ?? null,
            reason: 'invalid_input',
            errorMessage: issue.errorMessage,
          }))
        : [],
    providerIssues:
      result.outcome === 'provider_response_missing_current_round'
        ? result.providerIssues.map(issue => ({
            tournamentId: result.tournament.tournamentId,
            tournamentSlug: result.tournament.tournamentSlug,
            previousCurrentRound: result.tournament.previousCurrentRound ?? null,
            requestUrl: issue.requestUrl,
            fetchedRounds: result.fetchedRounds,
            reason: 'provider_response_missing_current_round',
            errorMessage: issue.errorMessage,
            causeMessage: issue.causeMessage,
            responseBodySnippet: issue.responseBodySnippet,
          }))
        : [],
    databaseFailures:
      result.outcome === 'database_update_failed'
        ? [
            {
              tournamentId: result.tournament.tournamentId,
              tournamentSlug: result.tournament.tournamentSlug,
              previousCurrentRound: result.tournament.previousCurrentRound ?? null,
              currentRoundSlug: result.currentRoundSlug,
              fetchedRounds: result.fetchedRounds,
              requestUrl: result.databaseUpdateFailure.requestUrl,
              reason: 'database_update_failed',
              errorMessage: result.databaseUpdateFailure.errorMessage,
              causeMessage: result.databaseUpdateFailure.causeMessage,
              responseBodySnippet: result.databaseUpdateFailure.responseBodySnippet,
            },
          ]
        : [],
    unexpectedFailures:
      result.outcome === 'unexpected_failure'
        ? [
            {
              tournamentId: result.tournament.tournamentId,
              tournamentSlug: result.tournament.tournamentSlug,
              previousCurrentRound: result.tournament.previousCurrentRound ?? null,
              currentRoundSlug: result.currentRoundSlug,
              fetchedRounds: result.fetchedRounds,
              requestUrl: result.unexpectedFailure.requestUrl,
              reason: 'unexpected_failure',
              errorMessage: result.unexpectedFailure.errorMessage,
              causeMessage: result.unexpectedFailure.causeMessage,
              responseBodySnippet: result.unexpectedFailure.responseBodySnippet,
            },
          ]
        : [],
  };
};

export const buildCurrentRoundSyncReportData = (
  result: TournamentCurrentRoundSyncWorkflowResult
): CurrentRoundSyncReportData => {
  const currentRoundSlug =
    result.outcome === 'updated' ||
    result.outcome === 'database_update_failed' ||
    result.outcome === 'unexpected_failure'
      ? result.currentRoundSlug
      : undefined;

  return {
    requestUrl: result.requestUrl,
    previousCurrentRound: result.tournament.previousCurrentRound ?? null,
    currentRoundSlug,
    fetchedRounds: result.fetchedRounds,
    updatedTournamentId: result.outcome === 'updated' ? result.updatedTournament.id : undefined,
  };
};

export const deriveCurrentRoundSyncWorkflowStatus = (
  result: TournamentCurrentRoundSyncWorkflowResult
): CurrentRoundSyncWorkflowStatus => {
  return result.outcome === 'updated' ? 'completed' : 'failed';
};

export const buildCurrentRoundSyncReport = (input: {
  requestId: string;
  result: TournamentCurrentRoundSyncWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: CurrentRoundSyncWorkflowStatus;
  summary: CurrentRoundSyncSummary;
  details: CurrentRoundSyncDetails;
  data: CurrentRoundSyncReportData;
}): CurrentRoundSyncReport => {
  return {
    requestId: input.requestId,
    operationType: CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentId: input.result.tournament.tournamentId,
      tournamentLabel: input.result.tournament.tournamentLabel,
      tournamentSlug: input.result.tournament.tournamentSlug,
      provider: input.result.tournament.provider,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};
