import type {
  MatchesCreateDetail,
  MatchesCreateReport,
  MatchesCreateReportData,
  MatchesCreateReportUploadResult,
  MatchesCreateWorkflowStatus,
  TournamentMatchesCreateDetails,
  TournamentMatchesCreateSummary,
  TournamentMatchesCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { MATCHES_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildMatchesCreateSummary = (
  result: TournamentMatchesCreateWorkflowResult
): TournamentMatchesCreateSummary => {
  const skippedExistingMatches = result.existingMatches.length;
  const blockedByMissingTeamsCount = result.blockedMatches.length;
  const providerIssuesCount = result.providerIssues.length;
  const invalidProviderMatchesCount = result.invalidProviderMatches.length;
  const missingRoundsPrerequisiteCount = result.outcome === 'rounds_prerequisite_missing' ? 1 : 0;

  switch (result.outcome) {
    case 'rounds_prerequisite_missing':
      return {
        totalOperations: 1,
        successfulOperations: 0,
        failedOperations: 1,
        roundsRequested: 0,
        fetchedRounds: 0,
        fetchedMatches: 0,
        createdMatches: 0,
        skippedExistingMatches: 0,
        blockedByMissingTeamsCount: 0,
        missingRoundsPrerequisiteCount,
        providerIssuesCount: 0,
        invalidProviderMatchesCount: 0,
      };
    case 'provider_sources_missing_matches': {
      const failedOperations = Math.max(1, providerIssuesCount + invalidProviderMatchesCount);

      return {
        totalOperations: failedOperations,
        successfulOperations: 0,
        failedOperations,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: 0,
        createdMatches: 0,
        skippedExistingMatches: 0,
        blockedByMissingTeamsCount: 0,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
    }
    case 'database_insert_failed':
      return {
        totalOperations:
          skippedExistingMatches + blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount + 1,
        successfulOperations: skippedExistingMatches,
        failedOperations: blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount + 1,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: result.discoveredMatches.length,
        createdMatches: 0,
        skippedExistingMatches,
        blockedByMissingTeamsCount,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
    case 'processed':
      return {
        totalOperations:
          result.createdMatches.length +
          skippedExistingMatches +
          blockedByMissingTeamsCount +
          providerIssuesCount +
          invalidProviderMatchesCount,
        successfulOperations: result.createdMatches.length + skippedExistingMatches,
        failedOperations: blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: result.discoveredMatches.length,
        createdMatches: result.createdMatches.length,
        skippedExistingMatches,
        blockedByMissingTeamsCount,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
  }
};

export const mergeMatchesCreateSummaryWithReportUpload = (input: {
  summary: TournamentMatchesCreateSummary;
  reportUpload: MatchesCreateReportUploadResult;
}): TournamentMatchesCreateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildMatchesCreateDetails = (
  result: TournamentMatchesCreateWorkflowResult
): TournamentMatchesCreateDetails => {
  return {
    created:
      result.outcome === 'processed' ? result.createdMatches.map(match => buildCreatedDetail(match, result)) : [],
    skippedExisting: result.existingMatches.map(match => ({
      matchId: match.id,
      matchExternalId: match.externalId,
      roundSlug: match.roundSlug,
      reason: 'existing_match_skipped',
    })),
    prerequisiteFailures:
      result.outcome === 'rounds_prerequisite_missing'
        ? [
            {
              reason: 'rounds_prerequisite_missing',
              errorMessage: result.missingRoundsPrerequisite.errorMessage,
            },
          ]
        : [],
    providerIssues: result.providerIssues.map(issue => ({
      roundId: issue.roundId,
      roundLabel: issue.roundLabel,
      roundSlug: issue.roundSlug,
      requestUrl: issue.requestUrl,
      reason: 'provider_source_missing_matches',
      errorMessage: issue.errorMessage,
      causeMessage: issue.causeMessage,
      responseBodySnippet: issue.responseBodySnippet,
    })),
    invalidProviderMatches: result.invalidProviderMatches.map(issue => ({
      matchExternalId: issue.matchExternalId,
      roundId: issue.roundId,
      roundLabel: issue.roundLabel,
      roundSlug: issue.roundSlug,
      requestUrl: issue.requestUrl,
      homeTeamExternalId: issue.homeTeamExternalId,
      awayTeamExternalId: issue.awayTeamExternalId,
      reason: 'provider_match_payload_invalid',
      errorMessage: issue.errorMessage,
    })),
    blockedByMissingTeams: result.blockedMatches.map(match => ({
      matchExternalId: match.matchExternalId,
      roundId: match.roundId,
      roundLabel: match.roundLabel,
      roundSlug: match.roundSlug,
      requestUrl: match.requestUrl,
      homeTeamExternalId: match.homeTeamExternalId,
      awayTeamExternalId: match.awayTeamExternalId,
      missingTeamExternalIds: match.missingTeamExternalIds,
      reason: 'team_reference_missing',
      errorMessage: 'Match references teams that do not exist locally yet',
    })),
    databaseFailures:
      result.outcome === 'database_insert_failed'
        ? [
            {
              reason: 'database_insert_failed',
              errorMessage: result.databaseInsertFailure.errorMessage,
              causeMessage: result.databaseInsertFailure.causeMessage,
              responseBodySnippet: result.databaseInsertFailure.responseBodySnippet,
            },
          ]
        : [],
    unexpectedFailures: [],
  };
};

export const buildMatchesCreateReportData = (
  result: TournamentMatchesCreateWorkflowResult
): MatchesCreateReportData => {
  return {
    requestedRoundIds: result.rounds.map(round => round.id),
    requestedRoundSlugs: result.rounds.map(round => round.slug),
    discoveredMatchExternalIds: result.discoveredMatches.map(match => match.externalId),
    existingMatchIds: result.existingMatches.map(match => match.id),
    existingMatchExternalIds: result.existingMatches.map(match => match.externalId),
    createdMatchIds: result.createdMatches.map(match => match.id),
    createdMatchExternalIds: result.createdMatches.map(match => match.externalId),
    blockedMatchExternalIds: result.blockedMatches.map(match => match.matchExternalId),
    resolvedTeamIds: result.resolvedTeams.map(team => team.id),
    resolvedTeamExternalIds: result.resolvedTeams.map(team => team.externalId),
  };
};

export const deriveMatchesCreateWorkflowStatus = (
  result: TournamentMatchesCreateWorkflowResult
): MatchesCreateWorkflowStatus => {
  const summary = buildMatchesCreateSummary(result);

  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

export const buildMatchesCreateReport = (input: {
  requestId: string;
  result: TournamentMatchesCreateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: MatchesCreateWorkflowStatus;
  summary: TournamentMatchesCreateSummary;
  details: TournamentMatchesCreateDetails;
  data: MatchesCreateReportData;
}): MatchesCreateReport => {
  return {
    requestId: input.requestId,
    operationType: MATCHES_CREATE_EXECUTION_OPERATION_TYPE,
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

const buildCreatedDetail = (
  match: {
    id: string;
    externalId: string;
    roundSlug: string;
  },
  result: TournamentMatchesCreateWorkflowResult
): MatchesCreateDetail => {
  const creatableMatch = result.creatableMatches.find(item => item.externalId === match.externalId);

  return {
    matchId: match.id,
    matchExternalId: match.externalId,
    roundId: creatableMatch?.roundId,
    roundLabel: creatableMatch?.roundLabel,
    roundSlug: match.roundSlug,
    requestUrl: creatableMatch?.requestUrl,
    homeTeamExternalId: creatableMatch?.externalHomeTeamId,
    awayTeamExternalId: creatableMatch?.externalAwayTeamId,
    reason: 'created',
  };
};
