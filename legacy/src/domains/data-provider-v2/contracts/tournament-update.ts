import type { DB_SelectTournament } from '@/domains/tournament/schema';

export type TournamentUpdateInput = {
  tournamentPublicId: string;
  baseUrl: string;
  publicUrl: string;
  slug: string;
  provider: 'sofascore';
  season: string;
  mode: DB_SelectTournament['mode'];
  label: string;
  standingsMode: DB_SelectTournament['standingsMode'];
};

export type TournamentUpdateField = keyof TournamentUpdateInput | 'logo';

export type TournamentUpdateInvalidInput = {
  field: keyof TournamentUpdateInput;
  errorMessage: string;
};

export type TournamentUpdateUploadedLogo = {
  assetKey: string;
  assetUrl?: string;
  contentType: string;
  requestUrl: string;
  responseUrl: string;
};

export type TournamentUpdateFailure = {
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentUpdateOutcome =
  | 'updated'
  | 'invalid_input'
  | 'logo_upload_failed'
  | 'database_update_failed'
  | 'unexpected_failure';

export type TournamentUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  updatedTournaments: number;
  uploadedAssets: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type TournamentUpdateDetail = {
  tournamentId: string;
  tournamentPublicId?: string;
  field?: keyof TournamentUpdateInput;
  changedFieldsPreview?: TournamentUpdateField[];
  logoRefreshRequired?: boolean;
  logoRefreshPerformed?: boolean;
  uploadedLogoUrl?: string;
  providerLogoUrl?: string;
  requestUrl?: string;
  reason: TournamentUpdateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentUpdateDetails = {
  updated: TournamentUpdateDetail[];
  invalidInput: TournamentUpdateDetail[];
  assetUploadFailures: TournamentUpdateDetail[];
  databaseFailures: TournamentUpdateDetail[];
  unexpectedFailures: TournamentUpdateDetail[];
};

export type TournamentUpdateReportData = {
  tournamentId: string;
  submittedInput: TournamentUpdateInput;
  previousTournamentPublicId: string;
  previousLogoUrl: string;
  updatedLogoUrl?: string;
  providerLogoUrl?: string;
  changedFieldsPreview: TournamentUpdateField[];
  logoRefreshRequired: boolean;
  logoRefreshPerformed: boolean;
};

export type TournamentUpdateWorkflowStatus = 'completed' | 'failed';

type TournamentUpdateWorkflowBase = {
  tournamentId: string;
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
  changedFields: TournamentUpdateField[];
  logoRefreshRequired: boolean;
};

export type TournamentUpdateWorkflowResult =
  | (TournamentUpdateWorkflowBase & {
      outcome: 'updated';
      logoRefreshPerformed: boolean;
      providerLogoUrl?: string;
      uploadedLogo?: TournamentUpdateUploadedLogo;
      updatedTournament: DB_SelectTournament;
    })
  | (TournamentUpdateWorkflowBase & {
      outcome: 'invalid_input';
      logoRefreshPerformed: false;
      invalidInput: TournamentUpdateInvalidInput[];
    })
  | (TournamentUpdateWorkflowBase & {
      outcome: 'logo_upload_failed';
      logoRefreshPerformed: false;
      providerLogoUrl: string;
      logoUploadFailure: TournamentUpdateFailure;
    })
  | (TournamentUpdateWorkflowBase & {
      outcome: 'database_update_failed';
      logoRefreshPerformed: boolean;
      providerLogoUrl?: string;
      uploadedLogo?: TournamentUpdateUploadedLogo;
      databaseUpdateFailure: TournamentUpdateFailure;
    });

export type TournamentUpdateResult = {
  tournamentId: string;
  tournamentPublicId: string;
  tournamentLabel: string;
  status: TournamentUpdateWorkflowStatus;
  summary: TournamentUpdateSummary;
  details: TournamentUpdateDetails;
  data: TournamentUpdateReportData;
};

export type TournamentUpdateReport = {
  requestId: string;
  operationType: 'tournament_update_v2';
  status: TournamentUpdateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentPublicId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentUpdateSummary;
  details: TournamentUpdateDetails;
  data: TournamentUpdateReportData;
};

export type TournamentUpdateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
