import type { DB_SelectTeam } from '@/domains/team/schema';
import type { DB_SelectTournament } from '@/domains/tournament/schema';
import type { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';

export type TeamsTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  baseUrl: string;
  tournamentPublicUrl?: string;
  provider: 'sofascore';
  mode: DB_SelectTournament['mode'];
};

export type TeamsKnockoutRoundContext = Pick<DB_SelectTournamentRound, 'id' | 'label' | 'slug' | 'providerUrl'>;

export type TeamsProviderSource = 'standings' | 'knockout_round';

export type TeamsSourceReference = {
  source: TeamsProviderSource;
  groupName?: string;
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
};

export type SofaScoreTeamPayload = {
  id: number;
  name: string;
  shortName: string;
};

export type SofaScoreStandingsTeamRow = {
  team: SofaScoreTeamPayload;
};

export type SofaScoreStandingsTeamsGroup = {
  name: string;
  rows: SofaScoreStandingsTeamRow[];
};

export type SofaScoreStandingsTeamsPayload = {
  standings: SofaScoreStandingsTeamsGroup[];
};

export type SofaScoreRoundEvent = {
  homeTeam: SofaScoreTeamPayload;
  awayTeam: SofaScoreTeamPayload;
};

export type SofaScoreRoundPayload = {
  events: SofaScoreRoundEvent[];
};

export type TeamsResolvedTeam = Pick<DB_SelectTeam, 'id' | 'externalId' | 'provider' | 'name' | 'shortName' | 'badge'>;

export type DiscoveredProviderTeam = {
  externalId: string;
  name: string;
  shortName: string;
  provider: 'sofascore';
  sources: TeamsSourceReference[];
};

export type TeamsProviderSourceIssue = {
  source: TeamsProviderSource;
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  kind: 'provider_404' | 'empty_payload' | 'missing_rounds' | 'no_mappable_teams';
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TeamsInvalidProviderTeam = {
  source: TeamsProviderSource;
  groupName?: string;
  roundId?: string;
  roundLabel?: string;
  roundSlug?: string;
  requestUrl?: string;
  teamExternalId?: string;
  teamName?: string;
  shortName?: string;
  errorMessage: string;
};

export type TeamsCreateUploadedBadge = {
  teamExternalId: string;
  assetKey: string;
  assetUrl?: string;
  contentType: string;
  requestUrl: string;
  responseUrl: string;
};

export type TeamsCreateFailure = {
  teamExternalId?: string;
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TeamsCreateOutcome =
  | 'created'
  | 'existing_team_skipped'
  | 'provider_source_missing_teams'
  | 'provider_team_payload_invalid'
  | 'asset_upload_failed'
  | 'database_insert_failed'
  | 'unexpected_failure';

export type TournamentTeamsCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedSources: number;
  fetchedTeams: number;
  createdTeams: number;
  skippedExistingTeams: number;
  uploadedAssets: number;
  providerMissingSourcesCount: number;
  invalidProviderTeamsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type TeamsCreateDetail = {
  teamId?: string;
  teamExternalId?: string;
  teamName?: string;
  shortName?: string;
  groupName?: string;
  roundSlug?: string;
  requestUrl?: string;
  badgeUrl?: string;
  reason: TeamsCreateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentTeamsCreateDetails = {
  created: TeamsCreateDetail[];
  skippedExisting: TeamsCreateDetail[];
  providerMissingSources: TeamsCreateDetail[];
  invalidProviderTeams: TeamsCreateDetail[];
  assetUploadFailures: TeamsCreateDetail[];
  databaseFailures: TeamsCreateDetail[];
  unexpectedFailures: TeamsCreateDetail[];
};

export type TeamsCreateReportData = {
  discoveredTeamExternalIds: string[];
  existingTeamIds: string[];
  existingTeamExternalIds: string[];
  createdTeamIds: string[];
  createdTeamExternalIds: string[];
  uploadedTeamExternalIds: string[];
};

export type TeamsCreateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type TeamsCreateWorkflowBase = {
  tournament: TeamsTournamentContext;
  fetchedSources: number;
  fetchedTeams: number;
  discoveredTeams: DiscoveredProviderTeam[];
  providerMissingSources: TeamsProviderSourceIssue[];
  invalidProviderTeams: TeamsInvalidProviderTeam[];
  existingTeams: TeamsResolvedTeam[];
};

export type TournamentTeamsCreateWorkflowResult =
  | (TeamsCreateWorkflowBase & {
      outcome: 'provider_sources_missing_teams';
      creatableTeams: [];
      uploadedBadges: [];
      createdTeams: [];
    })
  | (TeamsCreateWorkflowBase & {
      outcome: 'asset_upload_failed';
      creatableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      createdTeams: [];
      assetUploadFailure: TeamsCreateFailure;
    })
  | (TeamsCreateWorkflowBase & {
      outcome: 'database_insert_failed';
      creatableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      createdTeams: [];
      databaseInsertFailure: TeamsCreateFailure;
    })
  | (TeamsCreateWorkflowBase & {
      outcome: 'processed';
      creatableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      createdTeams: DB_SelectTeam[];
    });

export type TournamentTeamsCreateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsCreateWorkflowStatus;
  summary: TournamentTeamsCreateSummary;
  details: TournamentTeamsCreateDetails;
  data: TeamsCreateReportData;
};

export type TeamsCreateReport = {
  requestId: string;
  operationType: 'teams_create_v2';
  status: TeamsCreateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentTeamsCreateSummary;
  details: TournamentTeamsCreateDetails;
  data: TeamsCreateReportData;
};

export type TeamsCreateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type TeamsUpdateOutcome =
  | 'updated'
  | 'created_during_update'
  | 'provider_source_missing_teams'
  | 'provider_team_payload_invalid'
  | 'asset_upload_failed'
  | 'database_upsert_failed'
  | 'unexpected_failure';

export type TournamentTeamsUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedSources: number;
  fetchedTeams: number;
  upsertedTeams: number;
  createdTeams: number;
  updatedTeams: number;
  uploadedAssets: number;
  providerMissingSourcesCount: number;
  invalidProviderTeamsCount: number;
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type TeamsUpdateDetail = {
  teamId?: string;
  teamExternalId?: string;
  teamName?: string;
  shortName?: string;
  groupName?: string;
  roundSlug?: string;
  requestUrl?: string;
  badgeUrl?: string;
  reason: TeamsUpdateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentTeamsUpdateDetails = {
  upserted: TeamsUpdateDetail[];
  providerMissingSources: TeamsUpdateDetail[];
  invalidProviderTeams: TeamsUpdateDetail[];
  assetUploadFailures: TeamsUpdateDetail[];
  databaseFailures: TeamsUpdateDetail[];
  unexpectedFailures: TeamsUpdateDetail[];
};

export type TeamsUpdateReportData = {
  discoveredTeamExternalIds: string[];
  existingTeamIds: string[];
  existingTeamExternalIds: string[];
  upsertedTeamIds: string[];
  upsertedTeamExternalIds: string[];
  createdTeamIds: string[];
  updatedTeamIds: string[];
  uploadedTeamExternalIds: string[];
};

export type TeamsUpdateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

type TeamsUpdateWorkflowBase = {
  tournament: TeamsTournamentContext;
  fetchedSources: number;
  fetchedTeams: number;
  discoveredTeams: DiscoveredProviderTeam[];
  providerMissingSources: TeamsProviderSourceIssue[];
  invalidProviderTeams: TeamsInvalidProviderTeam[];
  existingTeams: TeamsResolvedTeam[];
};

export type TournamentTeamsUpdateWorkflowResult =
  | (TeamsUpdateWorkflowBase & {
      outcome: 'provider_sources_missing_teams';
      upsertableTeams: [];
      uploadedBadges: [];
      upsertedTeams: [];
      createdDuringUpdateTeams: [];
      updatedTeams: [];
    })
  | (TeamsUpdateWorkflowBase & {
      outcome: 'asset_upload_failed';
      upsertableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      upsertedTeams: [];
      createdDuringUpdateTeams: [];
      updatedTeams: [];
      assetUploadFailure: TeamsCreateFailure;
    })
  | (TeamsUpdateWorkflowBase & {
      outcome: 'database_upsert_failed';
      upsertableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      upsertedTeams: [];
      createdDuringUpdateTeams: [];
      updatedTeams: [];
      databaseUpsertFailure: TeamsCreateFailure;
    })
  | (TeamsUpdateWorkflowBase & {
      outcome: 'processed';
      upsertableTeams: DiscoveredProviderTeam[];
      uploadedBadges: TeamsCreateUploadedBadge[];
      upsertedTeams: DB_SelectTeam[];
      createdDuringUpdateTeams: DB_SelectTeam[];
      updatedTeams: DB_SelectTeam[];
    });

export type TournamentTeamsUpdateResult = {
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsUpdateWorkflowStatus;
  summary: TournamentTeamsUpdateSummary;
  details: TournamentTeamsUpdateDetails;
  data: TeamsUpdateReportData;
};

export type TeamsUpdateReport = {
  requestId: string;
  operationType: 'teams_update_v2';
  status: TeamsUpdateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentTeamsUpdateSummary;
  details: TournamentTeamsUpdateDetails;
  data: TeamsUpdateReportData;
};

export type TeamsUpdateReportUploadResult = TeamsCreateReportUploadResult;
