import type { DB_SelectMatch } from '@/domains/match/schema';

export type OpenMatchSyncDueMatch = {
  id: string;
  externalId: string;
  provider: string;
  status: DB_SelectMatch['status'];
  date: Date | null;
  tournamentId: string;
  roundSlug: string;
};

export type OpenMatchPollingUpdateInput = {
  matchId: string;
  status: DB_SelectMatch['status'];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltiesScore: number | null;
  awayPenaltiesScore: number | null;
  checkedAt: Date;
};

export type OpenMatchSyncUpdatedMatch = {
  id: string;
  externalId: string;
  status: DB_SelectMatch['status'];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltiesScore: number | null;
  awayPenaltiesScore: number | null;
  checkedAt: Date | null;
};

export type OpenMatchCheckedAtTouchInput = {
  matchId: string;
  checkedAt: Date;
};

export type OpenMatchSyncCheckedMatch = {
  id: string;
  externalId: string;
  status: DB_SelectMatch['status'];
  checkedAt: Date | null;
};

export type TournamentOpenMatchSyncSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  scannedMatches: number;
  updatedMatches: number;
  openMatches: number;
  endedMatches: number;
  providerNotFoundMatches: number;
  providerMissingEventMatches: number;
  unexpectedFailureMatches: number;
  updatedMatchIdsPreview?: string[];
  providerNotFoundMatchIdsPreview?: string[];
  unexpectedFailureMatchIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type OpenMatchSyncOutcome =
  | 'updated'
  | 'provider_status_not_ended'
  | 'provider_response_missing_event'
  | 'provider_match_not_found'
  | 'unexpected_failure';

export type OpenMatchSyncDetail = {
  matchId: string;
  externalId: string;
  roundSlug?: string;
  requestUrl?: string;
  providerStatus?: string;
  reason: OpenMatchSyncOutcome;
  errorMessage?: string;
  responseBodySnippet?: string;
};

export type OpenMatchSyncReportData = {
  updatedMatchIds: string[];
  providerNotFoundMatchIds: string[];
  providerMissingEventMatchIds: string[];
  unexpectedFailureMatchIds: string[];
};

export type TournamentOpenMatchSyncDetails = {
  updated: OpenMatchSyncDetail[];
  providerStatusNotEnded: OpenMatchSyncDetail[];
  providerResponseMissingEvent: OpenMatchSyncDetail[];
  providerMatchNotFound: OpenMatchSyncDetail[];
  unexpectedFailures: OpenMatchSyncDetail[];
};

export type TournamentOpenMatchSyncResult = {
  tournamentId: string;
  summary: TournamentOpenMatchSyncSummary;
  details: TournamentOpenMatchSyncDetails;
  data: OpenMatchSyncReportData;
};

export type OpenMatchSyncReport = {
  requestId: string;
  operationType: 'matches_sync_open_v2';
  status: 'completed' | 'failed';
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentOpenMatchSyncSummary;
  details: TournamentOpenMatchSyncDetails;
  data: OpenMatchSyncReportData;
};

export type OpenMatchSyncReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
