import type {
  TeamsUpdateDetail,
  TeamsUpdateReport,
  TeamsUpdateReportData,
  TeamsUpdateReportUploadResult,
  TeamsUpdateWorkflowStatus,
  TournamentTeamsUpdateDetails,
  TournamentTeamsUpdateSummary,
  TournamentTeamsUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/teams';
import { TEAMS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildTeamsUpdateSummary = (result: TournamentTeamsUpdateWorkflowResult): TournamentTeamsUpdateSummary => {
  const baseFailureCount = result.providerMissingSources.length + result.invalidProviderTeams.length;

  switch (result.outcome) {
    case 'provider_sources_missing_teams':
      return {
        totalOperations: Math.max(1, baseFailureCount),
        successfulOperations: 0,
        failedOperations: Math.max(1, baseFailureCount),
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        upsertedTeams: 0,
        createdTeams: 0,
        updatedTeams: 0,
        uploadedAssets: 0,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'asset_upload_failed':
      return {
        totalOperations: result.uploadedBadges.length + baseFailureCount + 1,
        successfulOperations: result.uploadedBadges.length,
        failedOperations: baseFailureCount + 1,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        upsertedTeams: 0,
        createdTeams: 0,
        updatedTeams: 0,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'database_upsert_failed':
      return {
        totalOperations: result.uploadedBadges.length + baseFailureCount + 1,
        successfulOperations: result.uploadedBadges.length,
        failedOperations: baseFailureCount + 1,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        upsertedTeams: 0,
        createdTeams: 0,
        updatedTeams: 0,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'processed':
      return {
        totalOperations: result.upsertedTeams.length + baseFailureCount,
        successfulOperations: result.upsertedTeams.length,
        failedOperations: baseFailureCount,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        upsertedTeams: result.upsertedTeams.length,
        createdTeams: result.createdDuringUpdateTeams.length,
        updatedTeams: result.updatedTeams.length,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
  }
};

export const mergeTeamsUpdateSummaryWithReportUpload = (input: {
  summary: TournamentTeamsUpdateSummary;
  reportUpload: TeamsUpdateReportUploadResult;
}): TournamentTeamsUpdateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildTeamsUpdateDetails = (result: TournamentTeamsUpdateWorkflowResult): TournamentTeamsUpdateDetails => {
  const upserted =
    result.outcome === 'processed' ? result.upsertedTeams.map(team => buildUpsertedDetail({ team, result })) : [];

  return {
    upserted,
    providerMissingSources: result.providerMissingSources.map(issue => ({
      roundSlug: issue.roundSlug,
      requestUrl: issue.requestUrl,
      reason: 'provider_source_missing_teams',
      errorMessage: issue.errorMessage,
      causeMessage: issue.causeMessage,
      responseBodySnippet: issue.responseBodySnippet,
    })),
    invalidProviderTeams: result.invalidProviderTeams.map(issue => ({
      teamExternalId: issue.teamExternalId,
      teamName: issue.teamName,
      shortName: issue.shortName,
      groupName: issue.groupName,
      roundSlug: issue.roundSlug,
      requestUrl: issue.requestUrl,
      reason: 'provider_team_payload_invalid',
      errorMessage: issue.errorMessage,
    })),
    assetUploadFailures:
      result.outcome === 'asset_upload_failed'
        ? [
            {
              teamExternalId: result.assetUploadFailure.teamExternalId,
              requestUrl: result.assetUploadFailure.requestUrl,
              reason: 'asset_upload_failed',
              errorMessage: result.assetUploadFailure.errorMessage,
              causeMessage: result.assetUploadFailure.causeMessage,
              responseBodySnippet: result.assetUploadFailure.responseBodySnippet,
            },
          ]
        : [],
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

export const buildTeamsUpdateReportData = (result: TournamentTeamsUpdateWorkflowResult): TeamsUpdateReportData => {
  return {
    discoveredTeamExternalIds: result.discoveredTeams.map(team => team.externalId),
    existingTeamIds: result.existingTeams.map(team => team.id),
    existingTeamExternalIds: result.existingTeams.map(team => team.externalId),
    upsertedTeamIds: result.upsertedTeams.map(team => team.id),
    upsertedTeamExternalIds: result.upsertedTeams.map(team => team.externalId),
    createdTeamIds: result.createdDuringUpdateTeams.map(team => team.id),
    updatedTeamIds: result.updatedTeams.map(team => team.id),
    uploadedTeamExternalIds: result.uploadedBadges.map(team => team.teamExternalId),
  };
};

export const deriveTeamsUpdateWorkflowStatus = (
  result: TournamentTeamsUpdateWorkflowResult
): TeamsUpdateWorkflowStatus => {
  const summary = buildTeamsUpdateSummary(result);

  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

export const buildTeamsUpdateReport = (input: {
  requestId: string;
  result: TournamentTeamsUpdateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: TeamsUpdateWorkflowStatus;
  summary: TournamentTeamsUpdateSummary;
  details: TournamentTeamsUpdateDetails;
  data: TeamsUpdateReportData;
}): TeamsUpdateReport => {
  return {
    requestId: input.requestId,
    operationType: TEAMS_UPDATE_EXECUTION_OPERATION_TYPE,
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
  team: {
    id: string;
    externalId: string;
    name: string;
    shortName: string | null;
  };
  result: TournamentTeamsUpdateWorkflowResult;
}): TeamsUpdateDetail => {
  const uploadedBadge = input.result.uploadedBadges.find(item => item.teamExternalId === input.team.externalId);
  const existingExternalIds = new Set(input.result.existingTeams.map(team => team.externalId));
  const reason = existingExternalIds.has(input.team.externalId) ? 'updated' : 'created_during_update';

  return {
    teamId: input.team.id,
    teamExternalId: input.team.externalId,
    teamName: input.team.name,
    shortName: input.team.shortName ?? undefined,
    badgeUrl: uploadedBadge?.assetUrl,
    reason,
  };
};
