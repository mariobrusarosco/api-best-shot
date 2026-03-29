import type {
  RoundsCreateDetail,
  RoundsCreateReport,
  RoundsCreateReportData,
  RoundsCreateReportUploadResult,
  RoundsCreateWorkflowStatus,
  TournamentRoundsCreateDetails,
  TournamentRoundsCreateSummary,
  TournamentRoundsCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/rounds';
import { ROUNDS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildRoundsCreateSummary = (
  result: TournamentRoundsCreateWorkflowResult
): TournamentRoundsCreateSummary => {
  const seasonRoundsCount = result.discoveredRounds.filter(round => round.type === 'season').length;
  const knockoutRoundsCount = result.discoveredRounds.filter(round => round.type === 'knockout').length;
  const providerIssuesCount = result.providerIssues.length;
  const invalidProviderRoundsCount = result.invalidProviderRounds.length;

  switch (result.outcome) {
    case 'provider_response_missing_rounds': {
      const failedOperations = Math.max(1, providerIssuesCount || invalidProviderRoundsCount);

      return {
        totalOperations: failedOperations,
        successfulOperations: 0,
        failedOperations,
        fetchedRounds: result.fetchedRounds,
        normalizedRounds: 0,
        createdRounds: 0,
        skippedExistingRounds: 0,
        seasonRoundsCount,
        knockoutRoundsCount,
        providerIssuesCount,
        invalidProviderRoundsCount,
      };
    }
    case 'database_upsert_failed': {
      const totalOperations = Math.max(result.fetchedRounds, result.upsertableRounds.length);

      return {
        totalOperations,
        successfulOperations: 0,
        failedOperations: totalOperations,
        fetchedRounds: result.fetchedRounds,
        normalizedRounds: result.discoveredRounds.length,
        createdRounds: 0,
        skippedExistingRounds: result.skippedExistingRounds.length,
        seasonRoundsCount,
        knockoutRoundsCount,
        providerIssuesCount,
        invalidProviderRoundsCount,
      };
    }
    case 'processed':
      return {
        totalOperations: result.fetchedRounds,
        successfulOperations: result.discoveredRounds.length,
        failedOperations: invalidProviderRoundsCount,
        fetchedRounds: result.fetchedRounds,
        normalizedRounds: result.discoveredRounds.length,
        createdRounds: result.createdRounds.length,
        skippedExistingRounds: result.skippedExistingRounds.length,
        seasonRoundsCount,
        knockoutRoundsCount,
        providerIssuesCount,
        invalidProviderRoundsCount,
      };
  }
};

export const mergeRoundsCreateSummaryWithReportUpload = (input: {
  summary: TournamentRoundsCreateSummary;
  reportUpload: RoundsCreateReportUploadResult;
}): TournamentRoundsCreateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildRoundsCreateDetails = (
  result: TournamentRoundsCreateWorkflowResult
): TournamentRoundsCreateDetails => {
  return {
    created: result.outcome === 'processed' ? result.createdRounds.map(round => buildCreatedDetail(round)) : [],
    skippedExisting: result.skippedExistingRounds.map(round => ({
      roundId: round.id,
      roundLabel: round.label,
      roundSlug: round.slug,
      roundType: round.type,
      requestUrl: round.providerUrl,
      reason: 'existing_round_skipped',
    })),
    providerIssues: result.providerIssues.map(issue => ({
      requestUrl: issue.requestUrl,
      reason: 'provider_response_missing_rounds',
      errorMessage: issue.errorMessage,
      causeMessage: issue.causeMessage,
      responseBodySnippet: issue.responseBodySnippet,
    })),
    invalidProviderRounds: result.invalidProviderRounds.map(issue => ({
      providerRound: issue.providerRound,
      providerName: issue.providerName,
      providerSlug: issue.providerSlug,
      providerPrefix: issue.providerPrefix,
      requestUrl: issue.requestUrl,
      reason: 'provider_round_payload_invalid',
      errorMessage: issue.errorMessage,
    })),
    databaseFailures:
      result.outcome === 'database_upsert_failed'
        ? [
            {
              requestUrl: result.databaseUpsertFailure.requestUrl,
              roundSlug: result.databaseUpsertFailure.roundSlug,
              reason: 'database_upsert_failed',
              errorMessage: result.databaseUpsertFailure.errorMessage,
              causeMessage: result.databaseUpsertFailure.causeMessage,
              responseBodySnippet: result.databaseUpsertFailure.responseBodySnippet,
            },
          ]
        : [],
    unexpectedFailures: [],
  };
};

export const buildRoundsCreateReportData = (result: TournamentRoundsCreateWorkflowResult): RoundsCreateReportData => {
  return {
    discoveredRoundSlugs: result.discoveredRounds.map(round => round.slug),
    existingRoundIds: result.existingRounds.map(round => round.id),
    existingRoundSlugs: result.existingRounds.map(round => round.slug),
    createdRoundIds: result.createdRounds.map(round => round.id),
    createdRoundSlugs: result.createdRounds.map(round => round.slug),
  };
};

export const deriveRoundsCreateWorkflowStatus = (
  result: TournamentRoundsCreateWorkflowResult
): RoundsCreateWorkflowStatus => {
  if (result.outcome !== 'processed') {
    return 'failed';
  }

  if (result.invalidProviderRounds.length > 0) {
    return 'partial_failure';
  }

  return 'completed';
};

export const buildRoundsCreateReport = (input: {
  requestId: string;
  result: TournamentRoundsCreateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: RoundsCreateWorkflowStatus;
  summary: TournamentRoundsCreateSummary;
  details: TournamentRoundsCreateDetails;
  data: RoundsCreateReportData;
}): RoundsCreateReport => {
  return {
    requestId: input.requestId,
    operationType: ROUNDS_CREATE_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentId: input.result.tournament.tournamentId,
      tournamentLabel: input.result.tournament.tournamentLabel,
      provider: input.result.tournament.provider,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};

const buildCreatedDetail = (round: {
  id: string;
  label: string;
  slug: string;
  type: RoundsCreateDetail['roundType'];
  providerUrl: string;
}): RoundsCreateDetail => {
  return {
    roundId: round.id,
    roundLabel: round.label,
    roundSlug: round.slug,
    roundType: round.type,
    requestUrl: round.providerUrl,
    reason: 'created',
  };
};
