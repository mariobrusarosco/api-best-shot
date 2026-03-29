import type {
  RoundsUpdateDetail,
  RoundsUpdateReport,
  RoundsUpdateReportData,
  RoundsUpdateReportUploadResult,
  RoundsUpdateWorkflowStatus,
  TournamentRoundsUpdateDetails,
  TournamentRoundsUpdateSummary,
  TournamentRoundsUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/rounds';
import { ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildRoundsUpdateSummary = (
  result: TournamentRoundsUpdateWorkflowResult
): TournamentRoundsUpdateSummary => {
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
        upsertedRounds: 0,
        createdRounds: 0,
        updatedRounds: 0,
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
        upsertedRounds: 0,
        createdRounds: 0,
        updatedRounds: 0,
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
        upsertedRounds: result.upsertedRounds.length,
        createdRounds: result.createdDuringUpdateRounds.length,
        updatedRounds: result.updatedRounds.length,
        seasonRoundsCount,
        knockoutRoundsCount,
        providerIssuesCount,
        invalidProviderRoundsCount,
      };
  }
};

export const mergeRoundsUpdateSummaryWithReportUpload = (input: {
  summary: TournamentRoundsUpdateSummary;
  reportUpload: RoundsUpdateReportUploadResult;
}): TournamentRoundsUpdateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildRoundsUpdateDetails = (
  result: TournamentRoundsUpdateWorkflowResult
): TournamentRoundsUpdateDetails => {
  const createdRoundIds =
    result.outcome === 'processed'
      ? new Set(result.createdDuringUpdateRounds.map(round => round.id))
      : new Set<string>();

  const upserted =
    result.outcome === 'processed'
      ? result.upsertedRounds.map(round => buildUpsertedDetail({ round, createdRoundIds }))
      : [];

  return {
    upserted,
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

export const buildRoundsUpdateReportData = (result: TournamentRoundsUpdateWorkflowResult): RoundsUpdateReportData => {
  return {
    discoveredRoundSlugs: result.discoveredRounds.map(round => round.slug),
    existingRoundIds: result.existingRounds.map(round => round.id),
    existingRoundSlugs: result.existingRounds.map(round => round.slug),
    upsertedRoundIds: result.upsertedRounds.map(round => round.id),
    createdRoundIds: result.createdDuringUpdateRounds.map(round => round.id),
    updatedRoundIds: result.updatedRounds.map(round => round.id),
  };
};

export const deriveRoundsUpdateWorkflowStatus = (
  result: TournamentRoundsUpdateWorkflowResult
): RoundsUpdateWorkflowStatus => {
  if (result.outcome !== 'processed') {
    return 'failed';
  }

  if (result.invalidProviderRounds.length > 0) {
    return 'partial_failure';
  }

  return 'completed';
};

export const buildRoundsUpdateReport = (input: {
  requestId: string;
  result: TournamentRoundsUpdateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: RoundsUpdateWorkflowStatus;
  summary: TournamentRoundsUpdateSummary;
  details: TournamentRoundsUpdateDetails;
  data: RoundsUpdateReportData;
}): RoundsUpdateReport => {
  return {
    requestId: input.requestId,
    operationType: ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE,
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

const buildUpsertedDetail = (input: {
  round: {
    id: string;
    label: string;
    slug: string;
    type: RoundsUpdateDetail['roundType'];
    providerUrl: string;
  };
  createdRoundIds: Set<string>;
}): RoundsUpdateDetail => {
  return {
    roundId: input.round.id,
    roundLabel: input.round.label,
    roundSlug: input.round.slug,
    roundType: input.round.type,
    requestUrl: input.round.providerUrl,
    reason: input.createdRoundIds.has(input.round.id) ? 'created_during_update' : 'updated',
  };
};
