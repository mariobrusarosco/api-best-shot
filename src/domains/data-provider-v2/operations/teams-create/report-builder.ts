import type {
  TeamsCreateDetail,
  TeamsCreateReport,
  TeamsCreateReportData,
  TeamsCreateReportUploadResult,
  TeamsCreateWorkflowStatus,
  TournamentTeamsCreateDetails,
  TournamentTeamsCreateSummary,
  TournamentTeamsCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/teams';
import { TEAMS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildTeamsCreateSummary = (result: TournamentTeamsCreateWorkflowResult): TournamentTeamsCreateSummary => {
  const baseFailureCount = result.providerMissingSources.length + result.invalidProviderTeams.length;
  const skippedExistingTeams = result.existingTeams.length;

  switch (result.outcome) {
    case 'provider_sources_missing_teams':
      return {
        totalOperations: Math.max(1, baseFailureCount),
        successfulOperations: 0,
        failedOperations: Math.max(1, baseFailureCount),
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        createdTeams: 0,
        skippedExistingTeams: 0,
        uploadedAssets: 0,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'asset_upload_failed':
      return {
        totalOperations: skippedExistingTeams + baseFailureCount + 1,
        successfulOperations: skippedExistingTeams,
        failedOperations: baseFailureCount + 1,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        createdTeams: 0,
        skippedExistingTeams,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'database_insert_failed':
      return {
        totalOperations: skippedExistingTeams + baseFailureCount + 1,
        successfulOperations: skippedExistingTeams,
        failedOperations: baseFailureCount + 1,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        createdTeams: 0,
        skippedExistingTeams,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
    case 'processed':
      return {
        totalOperations: result.createdTeams.length + skippedExistingTeams + baseFailureCount,
        successfulOperations: result.createdTeams.length + skippedExistingTeams,
        failedOperations: baseFailureCount,
        fetchedSources: result.fetchedSources,
        fetchedTeams: result.fetchedTeams,
        createdTeams: result.createdTeams.length,
        skippedExistingTeams,
        uploadedAssets: result.uploadedBadges.length,
        providerMissingSourcesCount: result.providerMissingSources.length,
        invalidProviderTeamsCount: result.invalidProviderTeams.length,
      };
  }
};

export const mergeTeamsCreateSummaryWithReportUpload = (input: {
  summary: TournamentTeamsCreateSummary;
  reportUpload: TeamsCreateReportUploadResult;
}): TournamentTeamsCreateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildTeamsCreateDetails = (result: TournamentTeamsCreateWorkflowResult): TournamentTeamsCreateDetails => {
  return {
    created: result.outcome === 'processed' ? result.createdTeams.map(team => buildCreatedDetail(team, result)) : [],
    skippedExisting: result.existingTeams.map(team => ({
      teamId: team.id,
      teamExternalId: team.externalId,
      teamName: team.name,
      shortName: team.shortName ?? undefined,
      badgeUrl: team.badge,
      reason: 'existing_team_skipped',
    })),
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

export const buildTeamsCreateReportData = (result: TournamentTeamsCreateWorkflowResult): TeamsCreateReportData => {
  return {
    discoveredTeamExternalIds: result.discoveredTeams.map(team => team.externalId),
    existingTeamIds: result.existingTeams.map(team => team.id),
    existingTeamExternalIds: result.existingTeams.map(team => team.externalId),
    createdTeamIds: result.createdTeams.map(team => team.id),
    createdTeamExternalIds: result.createdTeams.map(team => team.externalId),
    uploadedTeamExternalIds: result.uploadedBadges.map(team => team.teamExternalId),
  };
};

export const deriveTeamsCreateWorkflowStatus = (
  result: TournamentTeamsCreateWorkflowResult
): TeamsCreateWorkflowStatus => {
  const summary = buildTeamsCreateSummary(result);

  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

export const buildTeamsCreateReport = (input: {
  requestId: string;
  result: TournamentTeamsCreateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: TeamsCreateWorkflowStatus;
  summary: TournamentTeamsCreateSummary;
  details: TournamentTeamsCreateDetails;
  data: TeamsCreateReportData;
}): TeamsCreateReport => {
  return {
    requestId: input.requestId,
    operationType: TEAMS_CREATE_EXECUTION_OPERATION_TYPE,
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
  team: {
    id: string;
    externalId: string;
    name: string;
    shortName: string | null;
  },
  result: TournamentTeamsCreateWorkflowResult
): TeamsCreateDetail => {
  const uploadedBadge = result.uploadedBadges.find(item => item.teamExternalId === team.externalId);

  return {
    teamId: team.id,
    teamExternalId: team.externalId,
    teamName: team.name,
    shortName: team.shortName ?? undefined,
    badgeUrl: uploadedBadge?.assetUrl,
    reason: 'created',
  };
};
