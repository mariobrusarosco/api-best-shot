import type { DB_InsertTournament, DB_SelectTournament } from '@/domains/tournament/schema';

export type TournamentCreateInput = {
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

export type TournamentCreateInsertInput = Omit<DB_InsertTournament, 'createdAt' | 'updatedAt'>;

export type TournamentCreateInvalidInput = {
  field: keyof TournamentCreateInput;
  errorMessage: string;
};

export type TournamentCreateUploadedLogo = {
  assetKey: string;
  assetUrl?: string;
  contentType: string;
  requestUrl: string;
  responseUrl: string;
};

export type TournamentCreateFailure = {
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentCreateOutcome =
  | 'created'
  | 'invalid_input'
  | 'logo_upload_failed'
  | 'database_insert_failed'
  | 'unexpected_failure';

export type TournamentCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  createdTournaments: number;
  uploadedAssets: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type TournamentCreateDetail = {
  tournamentPublicId?: string;
  createdTournamentId?: string;
  field?: keyof TournamentCreateInput;
  uploadedLogoUrl?: string;
  requestUrl?: string;
  reason: TournamentCreateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentCreateDetails = {
  created: TournamentCreateDetail[];
  invalidInput: TournamentCreateDetail[];
  assetUploadFailures: TournamentCreateDetail[];
  databaseFailures: TournamentCreateDetail[];
  unexpectedFailures: TournamentCreateDetail[];
};

export type TournamentCreateReportData = {
  submittedInput: TournamentCreateInput;
  createdTournamentId?: string;
  uploadedLogoUrl?: string;
};

export type TournamentCreateWorkflowStatus = 'completed' | 'failed';

export type TournamentCreateWorkflowResult =
  | {
      outcome: 'created';
      tournament: TournamentCreateInput;
      uploadedLogo: TournamentCreateUploadedLogo;
      createdTournament: DB_SelectTournament;
    }
  | {
      outcome: 'invalid_input';
      tournament: TournamentCreateInput;
      invalidInput: TournamentCreateInvalidInput[];
    }
  | {
      outcome: 'logo_upload_failed';
      tournament: TournamentCreateInput;
      logoUploadFailure: TournamentCreateFailure;
    }
  | {
      outcome: 'database_insert_failed';
      tournament: TournamentCreateInput;
      uploadedLogo: TournamentCreateUploadedLogo;
      databaseInsertFailure: TournamentCreateFailure;
    };

export type TournamentCreateResult = {
  tournamentPublicId: string;
  tournamentLabel: string;
  createdTournamentId?: string;
  status: TournamentCreateWorkflowStatus;
  summary: TournamentCreateSummary;
  details: TournamentCreateDetails;
  data: TournamentCreateReportData;
};

export type TournamentCreateReport = {
  requestId: string;
  operationType: 'tournament_create_v2';
  status: TournamentCreateWorkflowStatus;
  tournament: {
    tournamentPublicId: string;
    createdTournamentId?: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentCreateSummary;
  details: TournamentCreateDetails;
  data: TournamentCreateReportData;
};

export type TournamentCreateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
