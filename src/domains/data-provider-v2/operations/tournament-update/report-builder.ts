import type {
  TournamentUpdateDetail,
  TournamentUpdateDetails,
  TournamentUpdateReport,
  TournamentUpdateReportData,
  TournamentUpdateReportUploadResult,
  TournamentUpdateSummary,
  TournamentUpdateWorkflowResult,
  TournamentUpdateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildTournamentUpdateSummary = (result: TournamentUpdateWorkflowResult): TournamentUpdateSummary => {
  const totalOperations = result.logoRefreshRequired ? 3 : 2;
  const uploadedAssets = result.logoRefreshPerformed ? 1 : 0;

  switch (result.outcome) {
    case 'invalid_input':
      return {
        totalOperations: 1,
        successfulOperations: 0,
        failedOperations: 1,
        updatedTournaments: 0,
        uploadedAssets: 0,
      };
    case 'logo_upload_failed':
      return {
        totalOperations: 2,
        successfulOperations: 1,
        failedOperations: 1,
        updatedTournaments: 0,
        uploadedAssets: 0,
      };
    case 'database_update_failed':
      return {
        totalOperations,
        successfulOperations: result.logoRefreshRequired ? 2 : 1,
        failedOperations: 1,
        updatedTournaments: 0,
        uploadedAssets,
      };
    case 'updated':
      return {
        totalOperations,
        successfulOperations: totalOperations,
        failedOperations: 0,
        updatedTournaments: 1,
        uploadedAssets,
      };
  }
};

export const mergeTournamentUpdateSummaryWithReportUpload = (input: {
  summary: TournamentUpdateSummary;
  reportUpload: TournamentUpdateReportUploadResult;
}): TournamentUpdateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildTournamentUpdateDetails = (result: TournamentUpdateWorkflowResult): TournamentUpdateDetails => {
  switch (result.outcome) {
    case 'invalid_input':
      return {
        updated: [],
        invalidInput: result.invalidInput.map(issue => ({
          tournamentId: result.tournamentId,
          tournamentPublicId: result.tournament.tournamentPublicId,
          field: issue.field,
          changedFieldsPreview: result.changedFields,
          logoRefreshRequired: result.logoRefreshRequired,
          logoRefreshPerformed: false,
          reason: 'invalid_input',
          errorMessage: issue.errorMessage,
        })),
        assetUploadFailures: [],
        databaseFailures: [],
        unexpectedFailures: [],
      };
    case 'logo_upload_failed':
      return {
        updated: [],
        invalidInput: [],
        assetUploadFailures: [
          {
            tournamentId: result.tournamentId,
            tournamentPublicId: result.tournament.tournamentPublicId,
            changedFieldsPreview: result.changedFields,
            logoRefreshRequired: result.logoRefreshRequired,
            logoRefreshPerformed: false,
            providerLogoUrl: result.providerLogoUrl,
            requestUrl: result.logoUploadFailure.requestUrl,
            reason: 'logo_upload_failed',
            errorMessage: result.logoUploadFailure.errorMessage,
            causeMessage: result.logoUploadFailure.causeMessage,
            responseBodySnippet: result.logoUploadFailure.responseBodySnippet,
          },
        ],
        databaseFailures: [],
        unexpectedFailures: [],
      };
    case 'database_update_failed':
      return {
        updated: [],
        invalidInput: [],
        assetUploadFailures: [],
        databaseFailures: [
          {
            tournamentId: result.tournamentId,
            tournamentPublicId: result.tournament.tournamentPublicId,
            changedFieldsPreview: result.changedFields,
            logoRefreshRequired: result.logoRefreshRequired,
            logoRefreshPerformed: result.logoRefreshPerformed,
            uploadedLogoUrl: result.uploadedLogo?.assetUrl,
            providerLogoUrl: result.providerLogoUrl,
            reason: 'database_update_failed',
            errorMessage: result.databaseUpdateFailure.errorMessage,
            causeMessage: result.databaseUpdateFailure.causeMessage,
            responseBodySnippet: result.databaseUpdateFailure.responseBodySnippet,
          },
        ],
        unexpectedFailures: [],
      };
    case 'updated':
      return {
        updated: [buildUpdatedTournamentDetail(result)],
        invalidInput: [],
        assetUploadFailures: [],
        databaseFailures: [],
        unexpectedFailures: [],
      };
  }
};

export const buildTournamentUpdateReportData = (result: TournamentUpdateWorkflowResult): TournamentUpdateReportData => {
  const baseData = {
    tournamentId: result.tournamentId,
    submittedInput: result.tournament,
    previousTournamentPublicId: result.previousTournament.externalId,
    previousLogoUrl: result.previousTournament.logo,
    changedFieldsPreview: result.changedFields,
    logoRefreshRequired: result.logoRefreshRequired,
    logoRefreshPerformed: result.logoRefreshPerformed,
  };

  switch (result.outcome) {
    case 'invalid_input':
      return baseData;
    case 'logo_upload_failed':
      return {
        ...baseData,
        providerLogoUrl: result.providerLogoUrl,
      };
    case 'database_update_failed':
      return {
        ...baseData,
        updatedLogoUrl: result.uploadedLogo?.assetUrl,
        providerLogoUrl: result.providerLogoUrl,
      };
    case 'updated':
      return {
        ...baseData,
        updatedLogoUrl: result.updatedTournament.logo,
        providerLogoUrl: result.providerLogoUrl,
      };
  }
};

export const deriveTournamentUpdateWorkflowStatus = (
  result: TournamentUpdateWorkflowResult
): TournamentUpdateWorkflowStatus => {
  return result.outcome === 'updated' ? 'completed' : 'failed';
};

export const buildTournamentUpdateReport = (input: {
  requestId: string;
  result: TournamentUpdateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: TournamentUpdateWorkflowStatus;
  summary: TournamentUpdateSummary;
  details: TournamentUpdateDetails;
  data: TournamentUpdateReportData;
}): TournamentUpdateReport => {
  return {
    requestId: input.requestId,
    operationType: TOURNAMENT_UPDATE_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentId: input.result.tournamentId,
      tournamentPublicId: input.result.tournament.tournamentPublicId,
      tournamentLabel: input.result.tournament.label,
      provider: input.result.tournament.provider,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};

const buildUpdatedTournamentDetail = (
  result: Extract<TournamentUpdateWorkflowResult, { outcome: 'updated' }>
): TournamentUpdateDetail => {
  return {
    tournamentId: result.tournamentId,
    tournamentPublicId: result.tournament.tournamentPublicId,
    changedFieldsPreview: result.changedFields,
    logoRefreshRequired: result.logoRefreshRequired,
    logoRefreshPerformed: result.logoRefreshPerformed,
    uploadedLogoUrl: result.uploadedLogo?.assetUrl,
    providerLogoUrl: result.providerLogoUrl,
    reason: 'updated',
  };
};
