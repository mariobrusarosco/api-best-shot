import type {
  StandingsCreateDetail,
  StandingsUpdateDetail,
  StandingsUpdateReportData,
  StandingsUpdateTournamentContext,
  StandingsUpdateWorkflowStatus,
  TournamentStandingsUpdateDetails,
  TournamentStandingsUpdateResult,
  TournamentStandingsUpdateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { upsertTournamentStandings } from '@/domains/data-provider-v2/persistence/standings/upsert-tournament-standings';
import { prepareTournamentStandings } from './prepare-tournament-standings';

const SUMMARY_PREVIEW_LIMIT = 10;

export const runTournamentStandingsUpdate = async (input: {
  tournament: StandingsUpdateTournamentContext;
  provider: SofaScoreStandingsProvider;
}): Promise<TournamentStandingsUpdateResult> => {
  const details = createEmptyDetails();
  const data = createEmptyReportData();
  const summary = createEmptySummary();

  const preparation = await prepareTournamentStandings({
    tournament: input.tournament,
    provider: input.provider,
  });

  if (preparation.outcome === 'unsupported_tournament_mode') {
    details.unsupportedTournamentMode.push({
      reason: 'tournament_mode_not_supported',
      errorMessage: `Tournament mode "${input.tournament.mode}" does not support standings update`,
    });

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  if (preparation.outcome === 'provider_missing_standings') {
    if (typeof preparation.fetchedGroups === 'number') {
      summary.fetchedGroups = preparation.fetchedGroups;
    }

    if (typeof preparation.fetchedRows === 'number') {
      summary.fetchedRows = preparation.fetchedRows;
    }

    if (typeof preparation.totalOperations === 'number') {
      summary.totalOperations = preparation.totalOperations;
    }

    details.providerMissingStandings.push({
      requestUrl: preparation.requestUrl,
      reason: 'provider_response_missing_standings',
      errorMessage:
        preparation.kind === 'no_mappable_rows'
          ? 'Provider standings payload did not contain any updatable standings rows'
          : preparation.errorMessage,
      causeMessage: preparation.causeMessage,
      responseBodySnippet: preparation.responseBodySnippet,
    });
    summary.providerMissingStandingsCount = 1;

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  if (preparation.outcome === 'unexpected_failure') {
    details.unexpectedFailures.push({
      requestUrl: preparation.requestUrl,
      reason: 'unexpected_failure',
      errorMessage: preparation.errorMessage,
      causeMessage: preparation.causeMessage,
      responseBodySnippet: preparation.responseBodySnippet,
    });

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  summary.fetchedGroups = preparation.fetchedGroups;
  summary.fetchedRows = preparation.fetchedRows;
  summary.totalOperations = preparation.totalOperations;

  if (preparation.missingTeams.length > 0) {
    details.missingTeams.push(...preparation.missingTeams.map(toUpdateMissingTeamDetail));
    data.missingTeamExternalIds.push(...preparation.missingTeamExternalIds);
    summary.missingTeamsCount = details.missingTeams.length;
    summary.failedOperations = summary.totalOperations;
    summary.missingTeamExternalIdsPreview = data.missingTeamExternalIds.slice(0, SUMMARY_PREVIEW_LIMIT);

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  try {
    const updated = await upsertTournamentStandings({
      rows: preparation.mappedRows,
    });

    details.updated.push(...updated);
    data.updatedTeamIds.push(...updated.map(detail => detail.teamId).filter(isNonEmptyString));

    summary.totalOperations = updated.length;
    summary.successfulOperations = updated.length;
    summary.updatedRows = updated.length;
    summary.updatedTeamIdsPreview = data.updatedTeamIds.slice(0, SUMMARY_PREVIEW_LIMIT);

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  } catch (error) {
    details.unexpectedFailures.push({
      reason: 'unexpected_failure',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    summary.failedOperations = summary.totalOperations;

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }
};

const buildResult = (input: {
  tournamentId: string;
  summary: TournamentStandingsUpdateSummary;
  details: TournamentStandingsUpdateDetails;
  data: StandingsUpdateReportData;
}): TournamentStandingsUpdateResult => {
  return {
    tournamentId: input.tournamentId,
    status: deriveWorkflowStatus({
      summary: input.summary,
      details: input.details,
    }),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};

const createEmptySummary = (): TournamentStandingsUpdateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedGroups: 0,
    fetchedRows: 0,
    updatedRows: 0,
    missingTeamsCount: 0,
    providerMissingStandingsCount: 0,
  };
};

const createEmptyDetails = (): TournamentStandingsUpdateDetails => {
  return {
    updated: [],
    unsupportedTournamentMode: [],
    providerMissingStandings: [],
    missingTeams: [],
    unexpectedFailures: [],
  };
};

const createEmptyReportData = (): StandingsUpdateReportData => {
  return {
    updatedTeamIds: [],
    missingTeamExternalIds: [],
  };
};

const deriveWorkflowStatus = (input: {
  summary: TournamentStandingsUpdateSummary;
  details: TournamentStandingsUpdateDetails;
}): StandingsUpdateWorkflowStatus => {
  const hasFailures =
    input.details.unsupportedTournamentMode.length > 0 ||
    input.details.providerMissingStandings.length > 0 ||
    input.details.missingTeams.length > 0 ||
    input.details.unexpectedFailures.length > 0;

  if (!hasFailures) {
    return 'completed';
  }

  if (input.summary.successfulOperations > 0) {
    return 'partial_failure';
  }

  return 'failed';
};

const isNonEmptyString = (value: string | undefined): value is string => {
  return typeof value === 'string' && value.trim() !== '';
};

const toUpdateMissingTeamDetail = (detail: StandingsCreateDetail): StandingsUpdateDetail => {
  return {
    teamId: detail.teamId,
    teamExternalId: detail.teamExternalId,
    teamName: detail.teamName,
    shortName: detail.shortName,
    groupName: detail.groupName,
    order: detail.order,
    requestUrl: detail.requestUrl,
    reason: 'provider_team_not_found_in_db',
    errorMessage: detail.errorMessage,
    causeMessage: detail.causeMessage,
    responseBodySnippet: detail.responseBodySnippet,
  };
};
