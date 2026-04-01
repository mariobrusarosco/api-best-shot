import type { DB_SelectTournament } from '@/domains/tournament/schema';

export type CurrentRoundSyncTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  tournamentSlug: string;
  baseUrl: string;
  provider: 'sofascore';
  previousCurrentRound?: string | null;
};

export type CurrentRoundSyncInvalidInput = {
  field: 'tournamentId' | 'baseUrl';
  errorMessage: string;
};

export type CurrentRoundSyncProviderIssue = {
  requestUrl: string;
  kind: 'provider_404' | 'request_failed' | 'missing_current_round';
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type CurrentRoundSyncFailure = {
  requestUrl?: string;
  currentRoundSlug?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type CurrentRoundSyncOutcome =
  | 'updated'
  | 'invalid_input'
  | 'provider_response_missing_current_round'
  | 'database_update_failed'
  | 'unexpected_failure';

export type CurrentRoundSyncSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedRounds: number;
  updatedTournaments: number;
  providerIssuesCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type CurrentRoundSyncDetail = {
  tournamentId: string;
  tournamentSlug?: string;
  previousCurrentRound?: string | null;
  currentRoundSlug?: string;
  fetchedRounds?: number;
  requestUrl?: string;
  reason: CurrentRoundSyncOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type CurrentRoundSyncDetails = {
  updated: CurrentRoundSyncDetail[];
  invalidInput: CurrentRoundSyncDetail[];
  providerIssues: CurrentRoundSyncDetail[];
  databaseFailures: CurrentRoundSyncDetail[];
  unexpectedFailures: CurrentRoundSyncDetail[];
};

export type CurrentRoundSyncReportData = {
  requestUrl?: string;
  previousCurrentRound?: string | null;
  currentRoundSlug?: string;
  fetchedRounds: number;
  updatedTournamentId?: string;
};

export type CurrentRoundSyncWorkflowStatus = 'completed' | 'failed';

type CurrentRoundSyncWorkflowBase = {
  tournament: CurrentRoundSyncTournamentContext;
  requestUrl?: string;
  fetchedRounds: number;
  providerIssues: CurrentRoundSyncProviderIssue[];
};

export type TournamentCurrentRoundSyncWorkflowResult =
  | (CurrentRoundSyncWorkflowBase & {
      outcome: 'updated';
      requestUrl: string;
      currentRoundSlug: string;
      updatedTournament: DB_SelectTournament;
    })
  | (CurrentRoundSyncWorkflowBase & {
      outcome: 'invalid_input';
      invalidInput: CurrentRoundSyncInvalidInput[];
    })
  | (CurrentRoundSyncWorkflowBase & {
      outcome: 'provider_response_missing_current_round';
      requestUrl: string;
    })
  | (CurrentRoundSyncWorkflowBase & {
      outcome: 'database_update_failed';
      requestUrl: string;
      currentRoundSlug: string;
      databaseUpdateFailure: CurrentRoundSyncFailure;
    })
  | (CurrentRoundSyncWorkflowBase & {
      outcome: 'unexpected_failure';
      unexpectedFailure: CurrentRoundSyncFailure;
      currentRoundSlug?: string;
    });

export type TournamentCurrentRoundSyncResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: CurrentRoundSyncWorkflowStatus;
  summary: CurrentRoundSyncSummary;
  details: CurrentRoundSyncDetails;
  data: CurrentRoundSyncReportData;
};

export type CurrentRoundSyncReport = {
  requestId: string;
  operationType: 'tournament_current_round_sync_v2';
  status: CurrentRoundSyncWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    tournamentSlug: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: CurrentRoundSyncSummary;
  details: CurrentRoundSyncDetails;
  data: CurrentRoundSyncReportData;
};

export type CurrentRoundSyncReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type CurrentRoundSyncBatchSummary = {
  schedulerTarget: 'tournaments.current_round_sync';
  totalRequestedTournaments: number;
  queuedTournaments: number;
  completedTournaments: number;
  failedTournaments: number;
  skippedInvalidTournaments: number;
  skippedTournamentIdsPreview?: string[];
};
