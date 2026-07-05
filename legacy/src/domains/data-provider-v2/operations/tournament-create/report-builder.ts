import type {
  TournamentCreateDetail,
  TournamentCreateDetails,
  TournamentCreateReport,
  TournamentCreateReportData,
  TournamentCreateReportUploadResult,
  TournamentCreateSummary,
  TournamentCreateWorkflowResult,
  TournamentCreateWorkflowStatus,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const buildTournamentCreateSummary = (result: TournamentCreateWorkflowResult): TournamentCreateSummary => {
  switch (result.outcome) {
    case 'invalid_input':
      return {
        totalOperations: 1,
        successfulOperations: 0,
        failedOperations: 1,
        createdTournaments: 0,
        uploadedAssets: 0,
      };
    case 'logo_upload_failed':
      return {
        totalOperations: 2,
        successfulOperations: 1,
        failedOperations: 1,
        createdTournaments: 0,
        uploadedAssets: 0,
      };
    case 'database_insert_failed':
      return {
        totalOperations: 3,
        successfulOperations: 2,
        failedOperations: 1,
        createdTournaments: 0,
        uploadedAssets: 1,
      };
    case 'created':
      return {
        totalOperations: 3,
        successfulOperations: 3,
        failedOperations: 0,
        createdTournaments: 1,
        uploadedAssets: 1,
      };
  }
};

export const mergeTournamentCreateSummaryWithReportUpload = (input: {
  summary: TournamentCreateSummary;
  reportUpload: TournamentCreateReportUploadResult;
}): TournamentCreateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildTournamentCreateDetails = (result: TournamentCreateWorkflowResult): TournamentCreateDetails => {
  switch (result.outcome) {
    case 'invalid_input':
      return {
        created: [],
        invalidInput: result.invalidInput.map(issue => ({
          field: issue.field,
          tournamentPublicId: result.tournament.tournamentPublicId,
          reason: 'invalid_input',
          errorMessage: issue.errorMessage,
        })),
        assetUploadFailures: [],
        databaseFailures: [],
        unexpectedFailures: [],
      };
    case 'logo_upload_failed':
      return {
        created: [],
        invalidInput: [],
        assetUploadFailures: [
          {
            tournamentPublicId: result.tournament.tournamentPublicId,
            requestUrl: result.logoUploadFailure.requestUrl,
            transportFlow: result.logoUploadFailure.transportFlow,
            reason: 'logo_upload_failed',
            errorMessage: result.logoUploadFailure.errorMessage,
            causeMessage: result.logoUploadFailure.causeMessage,
            responseBodySnippet: result.logoUploadFailure.responseBodySnippet,
          },
        ],
        databaseFailures: [],
        unexpectedFailures: [],
      };
    case 'database_insert_failed':
      return {
        created: [],
        invalidInput: [],
        assetUploadFailures: [],
        databaseFailures: [
          {
            tournamentPublicId: result.tournament.tournamentPublicId,
            uploadedLogoUrl: result.uploadedLogo.assetUrl,
            reason: 'database_insert_failed',
            errorMessage: result.databaseInsertFailure.errorMessage,
            causeMessage: result.databaseInsertFailure.causeMessage,
            responseBodySnippet: result.databaseInsertFailure.responseBodySnippet,
          },
        ],
        unexpectedFailures: [],
      };
    case 'created':
      return {
        created: [buildCreatedTournamentDetail(result)],
        invalidInput: [],
        assetUploadFailures: [],
        databaseFailures: [],
        unexpectedFailures: [],
      };
  }
};

export const buildTournamentCreateReportData = (result: TournamentCreateWorkflowResult): TournamentCreateReportData => {
  switch (result.outcome) {
    case 'invalid_input':
      return {
        submittedInput: result.tournament,
      };
    case 'logo_upload_failed':
      return {
        submittedInput: result.tournament,
      };
    case 'database_insert_failed':
      return {
        submittedInput: result.tournament,
        uploadedLogoUrl: result.uploadedLogo.assetUrl,
      };
    case 'created':
      return {
        submittedInput: result.tournament,
        createdTournamentId: result.createdTournament.id,
        uploadedLogoUrl: result.uploadedLogo.assetUrl,
        providerLogoUrl: result.providerLogoUrl,
      };
  }
};

export const deriveTournamentCreateWorkflowStatus = (
  result: TournamentCreateWorkflowResult
): TournamentCreateWorkflowStatus => {
  return result.outcome === 'created' ? 'completed' : 'failed';
};

export const buildTournamentCreateReport = (input: {
  requestId: string;
  result: TournamentCreateWorkflowResult;
  startedAt: Date;
  completedAt: Date;
  status: TournamentCreateWorkflowStatus;
  summary: TournamentCreateSummary;
  details: TournamentCreateDetails;
  data: TournamentCreateReportData;
}): TournamentCreateReport => {
  return {
    requestId: input.requestId,
    operationType: TOURNAMENT_CREATE_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentPublicId: input.result.tournament.tournamentPublicId,
      createdTournamentId: input.result.outcome === 'created' ? input.result.createdTournament.id : undefined,
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

const buildCreatedTournamentDetail = (
  result: Extract<TournamentCreateWorkflowResult, { outcome: 'created' }>
): TournamentCreateDetail => {
  return {
    tournamentPublicId: result.tournament.tournamentPublicId,
    createdTournamentId: result.createdTournament.id,
    uploadedLogoUrl: result.uploadedLogo.assetUrl,
    transportFlow: result.uploadedLogo.transportFlow,
    reason: 'created',
  };
};
