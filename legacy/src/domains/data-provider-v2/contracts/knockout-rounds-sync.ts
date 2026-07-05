import type {
  DiscoveredProviderRound,
  RoundsInvalidProviderRound,
  RoundsProviderIssue,
  RoundsResolvedRound,
} from '@/domains/data-provider-v2/contracts/rounds';
import type { TournamentMatchesCreateWorkflowResult } from '@/domains/data-provider-v2/contracts/matches';
import type { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import type { TournamentMode } from '@/domains/tournament/typing';

export type KnockoutRoundsSyncTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  tournamentSlug: string;
  baseUrl: string;
  provider: 'sofascore';
  mode: TournamentMode;
};

export type KnockoutRoundAvailabilityIssue = {
  roundLabel: string;
  roundSlug: string;
  requestUrl: string;
  kind: 'provider_404' | 'empty_payload' | 'request_failed';
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type KnockoutRoundsSyncFailure = {
  roundSlug?: string;
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type KnockoutRoundsSyncOutcome =
  | 'created_round'
  | 'round_already_exists'
  | 'round_not_ready'
  | 'provider_response_missing_rounds'
  | 'provider_round_payload_invalid'
  | 'provider_round_check_failed'
  | 'match_created'
  | 'existing_match_skipped'
  | 'match_provider_issue'
  | 'match_provider_payload_invalid'
  | 'match_team_reference_missing'
  | 'database_upsert_failed'
  | 'database_insert_failed'
  | 'unexpected_failure';

export type KnockoutRoundsSyncSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedRounds: number;
  discoveredKnockoutRounds: number;
  newKnockoutRoundCandidates: number;
  readyKnockoutRounds: number;
  createdRounds: number;
  createdMatches: number;
  skippedExistingMatches: number;
  roundsAwaitingAvailabilityCount: number;
  providerIssuesCount: number;
  invalidProviderRoundsCount: number;
  matchProviderIssuesCount: number;
  invalidProviderMatchesCount: number;
  blockedMatchesCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type KnockoutRoundsSyncDetail = {
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  roundType?: 'knockout';
  requestUrl?: string;
  matchId?: string;
  matchExternalId?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  missingTeamExternalIds?: string[];
  reason: KnockoutRoundsSyncOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type KnockoutRoundsSyncDetails = {
  createdRounds: KnockoutRoundsSyncDetail[];
  awaitingAvailability: KnockoutRoundsSyncDetail[];
  providerIssues: KnockoutRoundsSyncDetail[];
  invalidProviderRounds: KnockoutRoundsSyncDetail[];
  createdMatches: KnockoutRoundsSyncDetail[];
  skippedExistingMatches: KnockoutRoundsSyncDetail[];
  blockedMatches: KnockoutRoundsSyncDetail[];
  matchProviderIssues: KnockoutRoundsSyncDetail[];
  invalidProviderMatches: KnockoutRoundsSyncDetail[];
  databaseFailures: KnockoutRoundsSyncDetail[];
  unexpectedFailures: KnockoutRoundsSyncDetail[];
};

export type KnockoutRoundsSyncReportData = {
  requestUrl?: string;
  discoveredKnockoutRoundSlugs: string[];
  candidateKnockoutRoundSlugs: string[];
  readyKnockoutRoundSlugs: string[];
  createdRoundIds: string[];
  createdRoundSlugs: string[];
  createdMatchIds: string[];
  createdMatchExternalIds: string[];
  blockedMatchExternalIds: string[];
};

export type KnockoutRoundsSyncWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type KnockoutRoundsSyncWorkflowBase = {
  tournament: KnockoutRoundsSyncTournamentContext;
  requestUrl: string;
  fetchedRounds: number;
  discoveredRounds: DiscoveredProviderRound[];
  providerIssues: RoundsProviderIssue[];
  invalidProviderRounds: RoundsInvalidProviderRound[];
  existingRounds: RoundsResolvedRound[];
  candidateKnockoutRounds: DiscoveredProviderRound[];
  readyKnockoutRounds: DiscoveredProviderRound[];
  notReadyKnockoutRounds: KnockoutRoundAvailabilityIssue[];
};

export type TournamentKnockoutRoundsSyncWorkflowResult =
  | (KnockoutRoundsSyncWorkflowBase & {
      outcome: 'provider_response_missing_rounds';
      upsertableRounds: [];
      upsertedRounds: [];
      createdRounds: [];
      matchesResult: null;
    })
  | (KnockoutRoundsSyncWorkflowBase & {
      outcome: 'no_new_knockout_rounds';
      upsertableRounds: [];
      upsertedRounds: [];
      createdRounds: [];
      matchesResult: null;
    })
  | (KnockoutRoundsSyncWorkflowBase & {
      outcome: 'database_upsert_failed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: [];
      createdRounds: [];
      matchesResult: null;
      databaseUpsertFailure: KnockoutRoundsSyncFailure;
    })
  | (KnockoutRoundsSyncWorkflowBase & {
      outcome: 'processed';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: DB_SelectTournamentRound[];
      createdRounds: DB_SelectTournamentRound[];
      matchesResult: TournamentMatchesCreateWorkflowResult | null;
    })
  | (KnockoutRoundsSyncWorkflowBase & {
      outcome: 'unexpected_failure';
      upsertableRounds: DiscoveredProviderRound[];
      upsertedRounds: [];
      createdRounds: [];
      matchesResult: null;
      unexpectedFailure: KnockoutRoundsSyncFailure;
    });

export type TournamentKnockoutRoundsSyncResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: KnockoutRoundsSyncWorkflowStatus;
  summary: KnockoutRoundsSyncSummary;
  details: KnockoutRoundsSyncDetails;
  data: KnockoutRoundsSyncReportData;
};

export type KnockoutRoundsSyncReport = {
  requestId: string;
  operationType: 'tournament_knockout_rounds_sync_v2';
  status: KnockoutRoundsSyncWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    tournamentSlug: string;
    provider: 'sofascore';
    mode: TournamentMode;
  };
  startedAt: string;
  completedAt: string;
  summary: KnockoutRoundsSyncSummary;
  details: KnockoutRoundsSyncDetails;
  data: KnockoutRoundsSyncReportData;
};

export type KnockoutRoundsSyncReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type KnockoutRoundsSyncBatchSummary = {
  schedulerTarget: 'tournaments.knockout_rounds_sync';
  totalEligibleTournaments: number;
  queuedTournaments: number;
  completedTournaments: number;
  failedTournaments: number;
  skippedInvalidTournaments: number;
  skippedTournamentIdsPreview?: string[];
};
