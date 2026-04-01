import type {
  KnockoutRoundsSyncDetail,
  KnockoutRoundsSyncDetails,
  KnockoutRoundsSyncReport,
  KnockoutRoundsSyncReportData,
  KnockoutRoundsSyncReportUploadResult,
  KnockoutRoundsSyncSummary,
  KnockoutRoundsSyncWorkflowStatus,
  TournamentKnockoutRoundsSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import { KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildKnockoutRoundsSyncSummary = (
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncSummary => {
  const topLevelProviderIssueCount = result.providerIssues.length;
  const readinessFailureCount = result.notReadyKnockoutRounds.filter(issue => issue.kind === 'request_failed').length;
  const readinessWaitingCount = result.notReadyKnockoutRounds.filter(issue => issue.kind !== 'request_failed').length;
  const matchProviderIssuesCount = result.matchesResult?.providerIssues.length ?? 0;
  const invalidProviderMatchesCount = result.matchesResult?.invalidProviderMatches.length ?? 0;
  const blockedMatchesCount = result.matchesResult?.blockedMatches.length ?? 0;
  const createdMatches = result.matchesResult?.createdMatches.length ?? 0;
  const skippedExistingMatches = result.matchesResult?.existingMatches.length ?? 0;
  const databaseFailureCount =
    (result.outcome === 'database_upsert_failed' ? 1 : 0) +
    (result.matchesResult?.outcome === 'database_insert_failed' ? 1 : 0);
  const unexpectedFailureCount = result.outcome === 'unexpected_failure' ? 1 : 0;

  const successfulOperations = result.createdRounds.length + createdMatches + skippedExistingMatches;
  const failedOperations =
    topLevelProviderIssueCount +
    result.invalidProviderRounds.length +
    readinessFailureCount +
    matchProviderIssuesCount +
    invalidProviderMatchesCount +
    blockedMatchesCount +
    databaseFailureCount +
    unexpectedFailureCount;

  const totalOperations =
    successfulOperations + failedOperations > 0
      ? successfulOperations + failedOperations
      : result.outcome === 'no_new_knockout_rounds'
        ? 1
        : Math.max(1, result.candidateKnockoutRounds.length);

  return {
    totalOperations,
    successfulOperations,
    failedOperations,
    fetchedRounds: result.fetchedRounds,
    discoveredKnockoutRounds: result.discoveredRounds.filter(round => round.type === 'knockout').length,
    newKnockoutRoundCandidates: result.candidateKnockoutRounds.length,
    readyKnockoutRounds: result.readyKnockoutRounds.length,
    createdRounds: result.createdRounds.length,
    createdMatches,
    skippedExistingMatches,
    roundsAwaitingAvailabilityCount: readinessWaitingCount,
    providerIssuesCount: topLevelProviderIssueCount + readinessFailureCount,
    invalidProviderRoundsCount: result.invalidProviderRounds.length,
    matchProviderIssuesCount,
    invalidProviderMatchesCount,
    blockedMatchesCount,
  };
};

export const mergeKnockoutRoundsSyncSummaryWithReportUpload = (input: {
  summary: KnockoutRoundsSyncSummary;
  reportUpload: KnockoutRoundsSyncReportUploadResult;
}): KnockoutRoundsSyncSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildKnockoutRoundsSyncDetails = (
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncDetails => {
  return {
    createdRounds: result.createdRounds.map(round => ({
      roundId: round.id,
      roundLabel: round.label,
      roundSlug: round.slug,
      roundType: 'knockout',
      requestUrl: round.providerUrl,
      reason: 'created_round',
    })),
    awaitingAvailability: result.notReadyKnockoutRounds
      .filter(issue => issue.kind !== 'request_failed')
      .map(issue => ({
        roundLabel: issue.roundLabel,
        roundSlug: issue.roundSlug,
        requestUrl: issue.requestUrl,
        roundType: 'knockout',
        reason: 'round_not_ready',
        errorMessage: issue.errorMessage,
        causeMessage: issue.causeMessage,
        responseBodySnippet: issue.responseBodySnippet,
      })),
    providerIssues: [
      ...result.providerIssues.map(issue => ({
        requestUrl: issue.requestUrl,
        reason: 'provider_response_missing_rounds' as const,
        errorMessage: issue.errorMessage,
        causeMessage: issue.causeMessage,
        responseBodySnippet: issue.responseBodySnippet,
      })),
      ...result.notReadyKnockoutRounds
        .filter(issue => issue.kind === 'request_failed')
        .map(issue => ({
          roundLabel: issue.roundLabel,
          roundSlug: issue.roundSlug,
          requestUrl: issue.requestUrl,
          roundType: 'knockout' as const,
          reason: 'provider_round_check_failed' as const,
          errorMessage: issue.errorMessage,
          causeMessage: issue.causeMessage,
          responseBodySnippet: issue.responseBodySnippet,
        })),
    ],
    invalidProviderRounds: result.invalidProviderRounds.map(issue => ({
      roundLabel: issue.providerName,
      roundSlug: issue.providerSlug,
      requestUrl: issue.requestUrl,
      roundType: 'knockout',
      reason: 'provider_round_payload_invalid',
      errorMessage: issue.errorMessage,
    })),
    createdMatches: result.matchesResult?.createdMatches.map(match => buildCreatedMatchDetail(match, result)) ?? [],
    skippedExistingMatches:
      result.matchesResult?.existingMatches.map(match => ({
        matchId: match.id,
        matchExternalId: match.externalId,
        roundSlug: match.roundSlug,
        reason: 'existing_match_skipped',
      })) ?? [],
    blockedMatches:
      result.matchesResult?.blockedMatches.map(match => ({
        roundId: match.roundId,
        roundLabel: match.roundLabel,
        roundSlug: match.roundSlug,
        requestUrl: match.requestUrl,
        matchExternalId: match.matchExternalId,
        homeTeamExternalId: match.homeTeamExternalId,
        awayTeamExternalId: match.awayTeamExternalId,
        missingTeamExternalIds: match.missingTeamExternalIds,
        reason: 'match_team_reference_missing',
      })) ?? [],
    matchProviderIssues: buildMatchProviderIssueDetails(result.matchesResult),
    invalidProviderMatches:
      result.matchesResult?.invalidProviderMatches.map(match => ({
        roundId: match.roundId,
        roundLabel: match.roundLabel,
        roundSlug: match.roundSlug,
        requestUrl: match.requestUrl,
        matchExternalId: match.matchExternalId,
        homeTeamExternalId: match.homeTeamExternalId,
        awayTeamExternalId: match.awayTeamExternalId,
        reason: 'match_provider_payload_invalid',
        errorMessage: match.errorMessage,
      })) ?? [],
    databaseFailures: buildDatabaseFailureDetails(result),
    unexpectedFailures:
      result.outcome === 'unexpected_failure'
        ? [
            {
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

export const buildKnockoutRoundsSyncReportData = (
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncReportData => {
  return {
    requestUrl: result.requestUrl,
    discoveredKnockoutRoundSlugs: result.discoveredRounds
      .filter(round => round.type === 'knockout')
      .map(round => round.slug),
    candidateKnockoutRoundSlugs: result.candidateKnockoutRounds.map(round => round.slug),
    readyKnockoutRoundSlugs: result.readyKnockoutRounds.map(round => round.slug),
    createdRoundIds: result.createdRounds.map(round => round.id),
    createdRoundSlugs: result.createdRounds.map(round => round.slug),
    createdMatchIds: result.matchesResult?.createdMatches.map(match => match.id) ?? [],
    createdMatchExternalIds: result.matchesResult?.createdMatches.map(match => match.externalId) ?? [],
    blockedMatchExternalIds: result.matchesResult?.blockedMatches.map(match => match.matchExternalId) ?? [],
  };
};

export const deriveKnockoutRoundsSyncWorkflowStatus = (
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncWorkflowStatus => {
  const summary = buildKnockoutRoundsSyncSummary(result);

  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

export const buildKnockoutRoundsSyncReport = (input: {
  requestId: string;
  result: TournamentKnockoutRoundsSyncWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: KnockoutRoundsSyncWorkflowStatus;
  summary: KnockoutRoundsSyncSummary;
  details: KnockoutRoundsSyncDetails;
  data: KnockoutRoundsSyncReportData;
}): KnockoutRoundsSyncReport => {
  return {
    requestId: input.requestId,
    operationType: KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentId: input.result.tournament.tournamentId,
      tournamentLabel: input.result.tournament.tournamentLabel,
      tournamentSlug: input.result.tournament.tournamentSlug,
      provider: input.result.tournament.provider,
      mode: input.result.tournament.mode,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};

const buildCreatedMatchDetail = (
  match: {
    id: string;
    externalId: string;
    roundSlug: string;
    homeTeamId: string;
    awayTeamId: string;
  },
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncDetail => {
  const creatableMatch =
    result.matchesResult?.outcome === 'processed'
      ? result.matchesResult.creatableMatches.find(item => item.externalId === match.externalId)
      : result.matchesResult?.outcome === 'database_insert_failed'
        ? result.matchesResult.creatableMatches.find(item => item.externalId === match.externalId)
        : undefined;

  return {
    matchId: match.id,
    matchExternalId: match.externalId,
    roundSlug: match.roundSlug,
    requestUrl: creatableMatch?.requestUrl,
    reason: 'match_created',
  };
};

const buildMatchProviderIssueDetails = (
  matchesResult: TournamentKnockoutRoundsSyncWorkflowResult['matchesResult']
): KnockoutRoundsSyncDetail[] => {
  return (
    matchesResult?.providerIssues.map(issue => ({
      roundId: issue.roundId,
      roundLabel: issue.roundLabel,
      roundSlug: issue.roundSlug,
      requestUrl: issue.requestUrl,
      reason: 'match_provider_issue',
      errorMessage: issue.errorMessage,
      causeMessage: issue.causeMessage,
      responseBodySnippet: issue.responseBodySnippet,
    })) ?? []
  );
};

const buildDatabaseFailureDetails = (
  result: TournamentKnockoutRoundsSyncWorkflowResult
): KnockoutRoundsSyncDetail[] => {
  const details: KnockoutRoundsSyncDetail[] = [];

  if (result.outcome === 'database_upsert_failed') {
    details.push({
      reason: 'database_upsert_failed',
      errorMessage: result.databaseUpsertFailure.errorMessage,
      causeMessage: result.databaseUpsertFailure.causeMessage,
      responseBodySnippet: result.databaseUpsertFailure.responseBodySnippet,
    });
  }

  if (result.matchesResult?.outcome === 'database_insert_failed') {
    details.push({
      reason: 'database_insert_failed',
      errorMessage: result.matchesResult.databaseInsertFailure.errorMessage,
      causeMessage: result.matchesResult.databaseInsertFailure.causeMessage,
      responseBodySnippet: result.matchesResult.databaseInsertFailure.responseBodySnippet,
    });
  }

  return details;
};
