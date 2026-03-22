import type { DB_SelectTeam } from '@/domains/team/schema';
import type { DB_InsertTournamentStandings, DB_SelectTournament } from '@/domains/tournament/schema';

export type StandingsCreateTournamentContext = {
  tournamentId: string;
  tournamentLabel: string;
  baseUrl: string;
  provider: 'sofascore';
  mode: DB_SelectTournament['mode'];
  standingsMode: DB_SelectTournament['standingsMode'];
};

export type StandingsUpdateTournamentContext = StandingsCreateTournamentContext;

export type SofaScoreStandingsRow = {
  team: {
    id: number;
    name: string;
    shortName: string;
  };
  position: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoresFor: number;
  scoresAgainst: number;
  scoreDiffFormatted: string;
};

export type SofaScoreStandingsGroup = {
  name: string;
  rows: SofaScoreStandingsRow[];
};

export type SofaScoreStandingsPayload = {
  standings: SofaScoreStandingsGroup[];
};

export type StandingsResolvedTeam = Pick<DB_SelectTeam, 'id' | 'externalId' | 'provider' | 'name' | 'shortName'>;

export type MappedTournamentStandingsRowInput = Omit<DB_InsertTournamentStandings, 'id' | 'createdAt' | 'updatedAt'>;

export type StandingsCreateOutcome =
  | 'created'
  | 'tournament_mode_not_supported'
  | 'provider_response_missing_standings'
  | 'provider_team_not_found_in_db'
  | 'unexpected_failure';

export type TournamentStandingsCreateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedGroups: number;
  fetchedRows: number;
  createdRows: number;
  missingTeamsCount: number;
  providerMissingStandingsCount: number;
  createdTeamIdsPreview?: string[];
  missingTeamExternalIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type StandingsCreateDetail = {
  teamId?: string;
  teamExternalId?: string;
  teamName?: string;
  shortName?: string;
  groupName?: string;
  order?: number;
  requestUrl?: string;
  reason: StandingsCreateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentStandingsCreateDetails = {
  created: StandingsCreateDetail[];
  unsupportedTournamentMode: StandingsCreateDetail[];
  providerMissingStandings: StandingsCreateDetail[];
  missingTeams: StandingsCreateDetail[];
  unexpectedFailures: StandingsCreateDetail[];
};

export type StandingsCreateReportData = {
  createdTeamIds: string[];
  missingTeamExternalIds: string[];
};

export type StandingsCreateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

export type TournamentStandingsCreateResult = {
  tournamentId: string;
  status: StandingsCreateWorkflowStatus;
  summary: TournamentStandingsCreateSummary;
  details: TournamentStandingsCreateDetails;
  data: StandingsCreateReportData;
};

export type StandingsCreateReport = {
  requestId: string;
  operationType: 'standings_create_v2';
  status: StandingsCreateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentStandingsCreateSummary;
  details: TournamentStandingsCreateDetails;
  data: StandingsCreateReportData;
};

export type StandingsCreateReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};

export type StandingsUpdateOutcome =
  | 'updated'
  | 'tournament_mode_not_supported'
  | 'provider_response_missing_standings'
  | 'provider_team_not_found_in_db'
  | 'unexpected_failure';

export type TournamentStandingsUpdateSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  fetchedGroups: number;
  fetchedRows: number;
  updatedRows: number;
  missingTeamsCount: number;
  providerMissingStandingsCount: number;
  updatedTeamIdsPreview?: string[];
  missingTeamExternalIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type StandingsUpdateDetail = {
  teamId?: string;
  teamExternalId?: string;
  teamName?: string;
  shortName?: string;
  groupName?: string;
  order?: number;
  requestUrl?: string;
  reason: StandingsUpdateOutcome;
  errorMessage?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export type TournamentStandingsUpdateDetails = {
  updated: StandingsUpdateDetail[];
  unsupportedTournamentMode: StandingsUpdateDetail[];
  providerMissingStandings: StandingsUpdateDetail[];
  missingTeams: StandingsUpdateDetail[];
  unexpectedFailures: StandingsUpdateDetail[];
};

export type StandingsUpdateReportData = {
  updatedTeamIds: string[];
  missingTeamExternalIds: string[];
};

export type StandingsUpdateWorkflowStatus = 'completed' | 'partial_failure' | 'failed';

export type TournamentStandingsUpdateResult = {
  tournamentId: string;
  status: StandingsUpdateWorkflowStatus;
  summary: TournamentStandingsUpdateSummary;
  details: TournamentStandingsUpdateDetails;
  data: StandingsUpdateReportData;
};

export type StandingsUpdateReport = {
  requestId: string;
  operationType: 'standings_update_v2';
  status: StandingsUpdateWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
    provider: 'sofascore';
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentStandingsUpdateSummary;
  details: TournamentStandingsUpdateDetails;
  data: StandingsUpdateReportData;
};

export type StandingsUpdateBatchSummary = {
  totalRequestedTournaments: number;
  queuedTournaments: number;
  completedTournaments: number;
  failedTournaments: number;
  skippedInvalidTournaments: number;
  skippedTournamentIdsPreview?: string[];
};

export type StandingsUpdateReportUploadResult = StandingsCreateReportUploadResult;
