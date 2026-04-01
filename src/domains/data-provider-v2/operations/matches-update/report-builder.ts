import type {
  MatchesUpdateDetail,
  MatchesUpdateReport,
  MatchesUpdateReportData,
  MatchesUpdateReportUploadResult,
  MatchesUpdateWorkflowStatus,
  TournamentMatchesUpdateDetails,
  TournamentMatchesUpdateSummary,
  TournamentMatchesUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { MATCHES_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildMatchesUpdateSummary = (
  result: TournamentMatchesUpdateWorkflowResult
): TournamentMatchesUpdateSummary => {
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
        upsertedMatches: 0,
        createdMatches: 0,
        updatedMatches: 0,
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
        failedOperations: failedOperations,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: 0,
        upsertedMatches: 0,
        createdMatches: 0,
        updatedMatches: 0,
        blockedByMissingTeamsCount: 0,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
    }
    case 'database_upsert_failed':
      return {
        totalOperations: blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount + 1,
        successfulOperations: 0,
        failedOperations: blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount + 1,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: result.discoveredMatches.length,
        upsertedMatches: 0,
        createdMatches: 0,
        updatedMatches: 0,
        blockedByMissingTeamsCount,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
    case 'processed': {
      const existingMatchExternalIds = new Set(result.existingMatches.map(match => match.externalId));
      const createdMatchesCount = result.upsertedMatches.filter(
        match => !existingMatchExternalIds.has(match.externalId)
      ).length;
      const updatedMatchesCount = result.upsertedMatches.length - createdMatchesCount;

      return {
        totalOperations:
          result.upsertedMatches.length +
          blockedByMissingTeamsCount +
          providerIssuesCount +
          invalidProviderMatchesCount,
        successfulOperations: result.upsertedMatches.length,
        failedOperations: blockedByMissingTeamsCount + providerIssuesCount + invalidProviderMatchesCount,
        roundsRequested: result.rounds.length,
        fetchedRounds: result.fetchedRounds,
        fetchedMatches: result.discoveredMatches.length,
        upsertedMatches: result.upsertedMatches.length,
        createdMatches: createdMatchesCount,
        updatedMatches: updatedMatchesCount,
        blockedByMissingTeamsCount,
        missingRoundsPrerequisiteCount: 0,
        providerIssuesCount,
        invalidProviderMatchesCount,
      };
    }
  }
};

export const mergeMatchesUpdateSummaryWithReportUpload = (input: {
  summary: TournamentMatchesUpdateSummary;
  reportUpload: MatchesUpdateReportUploadResult;
}): TournamentMatchesUpdateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildMatchesUpdateDetails = (
  result: TournamentMatchesUpdateWorkflowResult
): TournamentMatchesUpdateDetails => {
  return {
    upserted:
      result.outcome === 'processed' ? result.upsertedMatches.map(match => buildUpsertedDetail(match, result)) : [],
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
      result.outcome === 'database_upsert_failed'
        ? [
            {
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

export const buildMatchesUpdateReportData = (
  result: TournamentMatchesUpdateWorkflowResult
): MatchesUpdateReportData => {
  const existingMatchExternalIds = new Set(result.existingMatches.map(match => match.externalId));
  const createdMatchIds: string[] = [];
  const updatedMatchIds: string[] = [];

  for (const match of result.upsertedMatches) {
    if (existingMatchExternalIds.has(match.externalId)) {
      updatedMatchIds.push(match.id);
      continue;
    }

    createdMatchIds.push(match.id);
  }

  return {
    requestedRoundIds: result.rounds.map(round => round.id),
    requestedRoundSlugs: result.rounds.map(round => round.slug),
    discoveredMatchExternalIds: result.discoveredMatches.map(match => match.externalId),
    existingMatchIds: result.existingMatches.map(match => match.id),
    existingMatchExternalIds: result.existingMatches.map(match => match.externalId),
    upsertedMatchIds: result.upsertedMatches.map(match => match.id),
    upsertedMatchExternalIds: result.upsertedMatches.map(match => match.externalId),
    createdMatchIds,
    updatedMatchIds,
    blockedMatchExternalIds: result.blockedMatches.map(match => match.matchExternalId),
    resolvedTeamIds: result.resolvedTeams.map(team => team.id),
    resolvedTeamExternalIds: result.resolvedTeams.map(team => team.externalId),
  };
};

export const deriveMatchesUpdateWorkflowStatus = (
  result: TournamentMatchesUpdateWorkflowResult
): MatchesUpdateWorkflowStatus => {
  const summary = buildMatchesUpdateSummary(result);

  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

export const buildMatchesUpdateReport = (input: {
  requestId: string;
  result: TournamentMatchesUpdateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: MatchesUpdateWorkflowStatus;
  summary: TournamentMatchesUpdateSummary;
  details: TournamentMatchesUpdateDetails;
  data: MatchesUpdateReportData;
}): MatchesUpdateReport => {
  return {
    requestId: input.requestId,
    operationType: MATCHES_UPDATE_EXECUTION_OPERATION_TYPE,
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

const buildUpsertedDetail = (
  match: {
    id: string;
    externalId: string;
    roundSlug: string;
  },
  result: TournamentMatchesUpdateWorkflowResult
): MatchesUpdateDetail => {
  const upsertableMatch = result.upsertableMatches.find(item => item.externalId === match.externalId);
  const existingMatchExternalIds = new Set(result.existingMatches.map(item => item.externalId));

  return {
    matchId: match.id,
    matchExternalId: match.externalId,
    roundId: upsertableMatch?.roundId,
    roundLabel: upsertableMatch?.roundLabel,
    roundSlug: match.roundSlug,
    requestUrl: upsertableMatch?.requestUrl,
    homeTeamExternalId: upsertableMatch?.externalHomeTeamId,
    awayTeamExternalId: upsertableMatch?.externalAwayTeamId,
    reason: existingMatchExternalIds.has(match.externalId) ? 'updated' : 'created_during_update',
  };
};
