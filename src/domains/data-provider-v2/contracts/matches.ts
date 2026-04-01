import type { DB_InsertMatch, DB_SelectMatch } from '@/domains/match/schema';
import type { DB_SelectTeam } from '@/domains/team/schema';
import type { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';

export type MatchesTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  provider: 'sofascore';
};

export type MatchesRoundContext = Pick<DB_SelectTournamentRound, 'id' | 'label' | 'slug' | 'providerUrl'>;

export type SofaScoreMatchScoreNode = {
  current?: number | null;
  display?: number | null;
  penalties?: number | null;
};

export type SofaScoreRoundMatchTeam = {
  id: number;
  name?: string;
  shortName?: string;
};

export type SofaScoreRoundMatchStatus = {
  description?: string;
  type?: string | null;
  code?: number;
};

export type SofaScoreRoundMatchEvent = {
  id: number;
  startTimestamp?: number | null;
  status?: SofaScoreRoundMatchStatus | null;
  homeTeam?: SofaScoreRoundMatchTeam | null;
  awayTeam?: SofaScoreRoundMatchTeam | null;
  homeScore?: SofaScoreMatchScoreNode | null;
  awayScore?: SofaScoreMatchScoreNode | null;
};

export type SofaScoreRoundMatchesPayload = {
  events: SofaScoreRoundMatchEvent[];
};

export type DiscoveredProviderMatch = Pick<
  DB_InsertMatch,
  | 'externalId'
  | 'provider'
  | 'tournamentId'
  | 'roundSlug'
  | 'externalHomeTeamId'
  | 'externalAwayTeamId'
  | 'homeScore'
  | 'homePenaltiesScore'
  | 'awayScore'
  | 'awayPenaltiesScore'
  | 'date'
  | 'status'
> & {
  roundId: string;
  roundLabel: string;
  requestUrl: string;
};

export type MatchesResolvedTeam = Pick<
  DB_SelectTeam,
  'id' | 'externalId' | 'provider' | 'name' | 'shortName' | 'badge'
>;

export type MatchesResolvedMatch = Pick<
  DB_SelectMatch,
  'id' | 'externalId' | 'provider' | 'tournamentId' | 'roundSlug'
>;

export type MatchesProviderIssue = {
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  kind: 'provider_404' | 'empty_payload';
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type MatchesInvalidProviderMatch = {
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  matchExternalId?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  errorMessage: string;
};

export type MatchesBlockedMatch = {
  roundId: string;
  roundLabel: string;
  roundSlug: string;
  requestUrl: string;
  matchExternalId: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  missingTeamExternalIds: string[];
};

export type MatchesCreateFailure = {
  matchExternalId?: string;
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type MatchesCreateOutcome =
  | 'created'
  | 'existing_match_skipped'
  | 'rounds_prerequisite_missing'
  | 'provider_source_missing_matches'
  | 'provider_match_payload_invalid'
  | 'team_reference_missing'
  | 'database_insert_failed'
  | 'unexpected_failure';

export type TournamentMatchesCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  roundsRequested: number;
  fetchedRounds: number;
  fetchedMatches: number;
  createdMatches: number;
  skippedExistingMatches: number;
  blockedByMissingTeamsCount: number;
  missingRoundsPrerequisiteCount: number;
  providerIssuesCount: number;
  invalidProviderMatchesCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type MatchesCreateDetail = {
  matchId?: string;
  matchExternalId?: string;
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  missingTeamExternalIds?: string[];
  reason: MatchesCreateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentMatchesCreateDetails = {
  created: MatchesCreateDetail[];
  skippedExisting: MatchesCreateDetail[];
  prerequisiteFailures: MatchesCreateDetail[];
  providerIssues: MatchesCreateDetail[];
  invalidProviderMatches: MatchesCreateDetail[];
  blockedByMissingTeams: MatchesCreateDetail[];
  databaseFailures: MatchesCreateDetail[];
  unexpectedFailures: MatchesCreateDetail[];
};

export type MatchesCreateReportData = {
  requestedRoundIds: string[];
  requestedRoundSlugs: string[];
  discoveredMatchExternalIds: string[];
  existingMatchIds: string[];
  existingMatchExternalIds: string[];
  createdMatchIds: string[];
  createdMatchExternalIds: string[];
  blockedMatchExternalIds: string[];
  resolvedTeamIds: string[];
  resolvedTeamExternalIds: string[];
};

export type MatchesCreateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type MatchesCreateWorkflowBase = {
  tournament: MatchesTournamentContext;
  rounds: MatchesRoundContext[];
  fetchedRounds: number;
  discoveredMatches: DiscoveredProviderMatch[];
  providerIssues: MatchesProviderIssue[];
  invalidProviderMatches: MatchesInvalidProviderMatch[];
  existingMatches: MatchesResolvedMatch[];
  resolvedTeams: MatchesResolvedTeam[];
  blockedMatches: MatchesBlockedMatch[];
};

export type TournamentMatchesCreateWorkflowResult =
  | (MatchesCreateWorkflowBase & {
      outcome: 'rounds_prerequisite_missing';
      creatableMatches: [];
      createdMatches: [];
      missingRoundsPrerequisite: {
        errorMessage: string;
      };
    })
  | (MatchesCreateWorkflowBase & {
      outcome: 'provider_sources_missing_matches';
      creatableMatches: [];
      createdMatches: [];
    })
  | (MatchesCreateWorkflowBase & {
      outcome: 'database_insert_failed';
      creatableMatches: Array<
        DB_InsertMatch & { externalId: string; roundId: string; roundLabel: string; requestUrl: string }
      >;
      createdMatches: [];
      databaseInsertFailure: MatchesCreateFailure;
    })
  | (MatchesCreateWorkflowBase & {
      outcome: 'processed';
      creatableMatches: Array<
        DB_InsertMatch & { externalId: string; roundId: string; roundLabel: string; requestUrl: string }
      >;
      createdMatches: DB_SelectMatch[];
    });

export type TournamentMatchesCreateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesCreateWorkflowStatus;
  summary: TournamentMatchesCreateSummary;
  details: TournamentMatchesCreateDetails;
  data: MatchesCreateReportData;
};

export type MatchesCreateReport = {
  requestId: string;
  operationType: 'matches_create_v2';
  status: MatchesCreateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentMatchesCreateSummary;
  details: TournamentMatchesCreateDetails;
  data: MatchesCreateReportData;
};

export type MatchesCreateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type MatchesUpdateOutcome =
  | 'updated'
  | 'created_during_update'
  | 'rounds_prerequisite_missing'
  | 'provider_source_missing_matches'
  | 'provider_match_payload_invalid'
  | 'team_reference_missing'
  | 'database_upsert_failed'
  | 'unexpected_failure';

export type TournamentMatchesUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  roundsRequested: number;
  fetchedRounds: number;
  fetchedMatches: number;
  upsertedMatches: number;
  createdMatches: number;
  updatedMatches: number;
  blockedByMissingTeamsCount: number;
  missingRoundsPrerequisiteCount: number;
  providerIssuesCount: number;
  invalidProviderMatchesCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type MatchesUpdateDetail = {
  matchId?: string;
  matchExternalId?: string;
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  missingTeamExternalIds?: string[];
  reason: MatchesUpdateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentMatchesUpdateDetails = {
  upserted: MatchesUpdateDetail[];
  prerequisiteFailures: MatchesUpdateDetail[];
  providerIssues: MatchesUpdateDetail[];
  invalidProviderMatches: MatchesUpdateDetail[];
  blockedByMissingTeams: MatchesUpdateDetail[];
  databaseFailures: MatchesUpdateDetail[];
  unexpectedFailures: MatchesUpdateDetail[];
};

export type MatchesUpdateReportData = {
  requestedRoundIds: string[];
  requestedRoundSlugs: string[];
  discoveredMatchExternalIds: string[];
  existingMatchIds: string[];
  existingMatchExternalIds: string[];
  upsertedMatchIds: string[];
  upsertedMatchExternalIds: string[];
  createdMatchIds: string[];
  updatedMatchIds: string[];
  blockedMatchExternalIds: string[];
  resolvedTeamIds: string[];
  resolvedTeamExternalIds: string[];
};

export type MatchesUpdateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type MatchesUpdateWorkflowBase = {
  tournament: MatchesTournamentContext;
  rounds: MatchesRoundContext[];
  fetchedRounds: number;
  discoveredMatches: DiscoveredProviderMatch[];
  providerIssues: MatchesProviderIssue[];
  invalidProviderMatches: MatchesInvalidProviderMatch[];
  existingMatches: MatchesResolvedMatch[];
  resolvedTeams: MatchesResolvedTeam[];
  blockedMatches: MatchesBlockedMatch[];
};

export type TournamentMatchesUpdateWorkflowResult =
  | (MatchesUpdateWorkflowBase & {
      outcome: 'rounds_prerequisite_missing';
      upsertableMatches: [];
      upsertedMatches: [];
      missingRoundsPrerequisite: {
        errorMessage: string;
      };
    })
  | (MatchesUpdateWorkflowBase & {
      outcome: 'provider_sources_missing_matches';
      upsertableMatches: [];
      upsertedMatches: [];
    })
  | (MatchesUpdateWorkflowBase & {
      outcome: 'database_upsert_failed';
      upsertableMatches: Array<
        DB_InsertMatch & { externalId: string; roundId: string; roundLabel: string; requestUrl: string }
      >;
      upsertedMatches: [];
      databaseUpsertFailure: MatchesCreateFailure;
    })
  | (MatchesUpdateWorkflowBase & {
      outcome: 'processed';
      upsertableMatches: Array<
        DB_InsertMatch & { externalId: string; roundId: string; roundLabel: string; requestUrl: string }
      >;
      upsertedMatches: DB_SelectMatch[];
    });

export type TournamentMatchesUpdateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesUpdateWorkflowStatus;
  summary: TournamentMatchesUpdateSummary;
  details: TournamentMatchesUpdateDetails;
  data: MatchesUpdateReportData;
};

export type MatchesUpdateReport = {
  requestId: string;
  operationType: 'matches_update_v2';
  status: MatchesUpdateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentMatchesUpdateSummary;
  details: TournamentMatchesUpdateDetails;
  data: MatchesUpdateReportData;
};

export type MatchesUpdateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
