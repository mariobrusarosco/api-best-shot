import type { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import type { ITournamentRoundType } from '@/domains/tournament-round/typing';

export type RoundsTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  baseUrl: string;
  provider: 'sofascore';
};

export type SofaScoreTournamentRoundEntry = {
  round: number;
  name?: string;
  slug?: string;
  prefix?: string;
};

export type SofaScoreTournamentRoundsPayload = {
  currentRound?: SofaScoreTournamentRoundEntry | null;
  rounds: SofaScoreTournamentRoundEntry[];
};

export type DiscoveredProviderRound = Pick<
  DB_SelectTournamentRound,
  'tournamentId' | 'order' | 'label' | 'slug' | 'knockoutId' | 'prefix' | 'providerUrl' | 'providerId' | 'type'
>;

export type RoundsResolvedRound = Pick<
  DB_SelectTournamentRound,
  'id' | 'tournamentId' | 'order' | 'label' | 'slug' | 'providerUrl' | 'providerId' | 'type'
>;

export type RoundsProviderIssue = {
  requestUrl: string;
  kind: 'provider_404' | 'empty_payload';
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type RoundsInvalidProviderRound = {
  providerRound?: number;
  providerName?: string;
  providerSlug?: string;
  providerPrefix?: string;
  requestUrl: string;
  errorMessage: string;
};

export type RoundsWorkflowFailure = {
  requestUrl?: string;
  roundSlug?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type RoundsCreateOutcome =
  | 'created'
  | 'existing_round_skipped'
  | 'provider_response_missing_rounds'
  | 'provider_round_payload_invalid'
  | 'database_upsert_failed'
  | 'unexpected_failure';

export type TournamentRoundsCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedRounds: number;
  normalizedRounds: number;
  createdRounds: number;
  skippedExistingRounds: number;
  seasonRoundsCount: number;
  knockoutRoundsCount: number;
  providerIssuesCount: number;
  invalidProviderRoundsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type RoundsCreateDetail = {
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  roundType?: ITournamentRoundType;
  providerRound?: number;
  providerName?: string;
  providerSlug?: string;
  providerPrefix?: string;
  requestUrl?: string;
  reason: RoundsCreateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentRoundsCreateDetails = {
  created: RoundsCreateDetail[];
  skippedExisting: RoundsCreateDetail[];
  providerIssues: RoundsCreateDetail[];
  invalidProviderRounds: RoundsCreateDetail[];
  databaseFailures: RoundsCreateDetail[];
  unexpectedFailures: RoundsCreateDetail[];
};

export type RoundsCreateReportData = {
  discoveredRoundSlugs: string[];
  existingRoundIds: string[];
  existingRoundSlugs: string[];
  createdRoundIds: string[];
  createdRoundSlugs: string[];
};

export type RoundsCreateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type RoundsCreateWorkflowBase = {
  tournament: RoundsTournamentContext;
  requestUrl: string;
  fetchedRounds: number;
  discoveredRounds: DiscoveredProviderRound[];
  providerIssues: RoundsProviderIssue[];
  invalidProviderRounds: RoundsInvalidProviderRound[];
  existingRounds: RoundsResolvedRound[];
};

export type TournamentRoundsCreateWorkflowResult =
  | (RoundsCreateWorkflowBase & {
      outcome: 'provider_response_missing_rounds';
      upsertableRounds: [];
      upsertedRounds: [];
      createdRounds: [];
      skippedExistingRounds: [];
    })
  | (RoundsCreateWorkflowBase & {
      outcome: 'database_upsert_failed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: [];
      createdRounds: [];
      skippedExistingRounds: RoundsResolvedRound[];
      databaseUpsertFailure: RoundsWorkflowFailure;
    })
  | (RoundsCreateWorkflowBase & {
      outcome: 'processed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: DB_SelectTournamentRound[];
      createdRounds: DB_SelectTournamentRound[];
      skippedExistingRounds: RoundsResolvedRound[];
    });

export type TournamentRoundsCreateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsCreateWorkflowStatus;
  summary: TournamentRoundsCreateSummary;
  details: TournamentRoundsCreateDetails;
  data: RoundsCreateReportData;
};

export type RoundsCreateReport = {
  requestId: string;
  operationType: 'rounds_create_v2';
  status: RoundsCreateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentRoundsCreateSummary;
  details: TournamentRoundsCreateDetails;
  data: RoundsCreateReportData;
};

export type RoundsCreateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type RoundsUpdateOutcome =
  | 'updated'
  | 'created_during_update'
  | 'provider_response_missing_rounds'
  | 'provider_round_payload_invalid'
  | 'database_upsert_failed'
  | 'unexpected_failure';

export type TournamentRoundsUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedRounds: number;
  normalizedRounds: number;
  upsertedRounds: number;
  createdRounds: number;
  updatedRounds: number;
  seasonRoundsCount: number;
  knockoutRoundsCount: number;
  providerIssuesCount: number;
  invalidProviderRoundsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type RoundsUpdateDetail = {
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  roundType?: ITournamentRoundType;
  providerRound?: number;
  providerName?: string;
  providerSlug?: string;
  providerPrefix?: string;
  requestUrl?: string;
  reason: RoundsUpdateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentRoundsUpdateDetails = {
  upserted: RoundsUpdateDetail[];
  providerIssues: RoundsUpdateDetail[];
  invalidProviderRounds: RoundsUpdateDetail[];
  databaseFailures: RoundsUpdateDetail[];
  unexpectedFailures: RoundsUpdateDetail[];
};

export type RoundsUpdateReportData = {
  discoveredRoundSlugs: string[];
  existingRoundIds: string[];
  existingRoundSlugs: string[];
  upsertedRoundIds: string[];
  createdRoundIds: string[];
  updatedRoundIds: string[];
};

export type RoundsUpdateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type RoundsUpdateWorkflowBase = {
  tournament: RoundsTournamentContext;
  requestUrl: string;
  fetchedRounds: number;
  discoveredRounds: DiscoveredProviderRound[];
  providerIssues: RoundsProviderIssue[];
  invalidProviderRounds: RoundsInvalidProviderRound[];
  existingRounds: RoundsResolvedRound[];
};

export type TournamentRoundsUpdateWorkflowResult =
  | (RoundsUpdateWorkflowBase & {
      outcome: 'provider_response_missing_rounds';
      upsertableRounds: [];
      upsertedRounds: [];
      createdDuringUpdateRounds: [];
      updatedRounds: [];
    })
  | (RoundsUpdateWorkflowBase & {
      outcome: 'database_upsert_failed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: [];
      createdDuringUpdateRounds: [];
      updatedRounds: [];
      databaseUpsertFailure: RoundsWorkflowFailure;
    })
  | (RoundsUpdateWorkflowBase & {
      outcome: 'processed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: DB_SelectTournamentRound[];
      createdDuringUpdateRounds: DB_SelectTournamentRound[];
      updatedRounds: DB_SelectTournamentRound[];
    });

export type TournamentRoundsUpdateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsUpdateWorkflowStatus;
  summary: TournamentRoundsUpdateSummary;
  details: TournamentRoundsUpdateDetails;
  data: RoundsUpdateReportData;
};

export type RoundsUpdateReport = {
  requestId: string;
  operationType: 'rounds_update_v2';
  status: RoundsUpdateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentRoundsUpdateSummary;
  details: TournamentRoundsUpdateDetails;
  data: RoundsUpdateReportData;
};

export type RoundsUpdateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
