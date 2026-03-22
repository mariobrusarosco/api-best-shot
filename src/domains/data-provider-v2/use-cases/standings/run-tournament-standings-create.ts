import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  SofaScoreStandingsPayload,
  StandingsCreateDetail,
  StandingsCreateReportData,
  StandingsCreateTournamentContext,
  StandingsCreateWorkflowStatus,
  TournamentStandingsCreateDetails,
  TournamentStandingsCreateResult,
  TournamentStandingsCreateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { listTeamsByExternalId } from '@/domains/data-provider-v2/persistence/standings/list-teams-by-external-id';
import { insertTournamentStandings } from '@/domains/data-provider-v2/persistence/standings/insert-tournament-standings';
import { extractStandingsTeamExternalIds, mapProviderStandings } from './map-provider-standings';

const SUMMARY_PREVIEW_LIMIT = 10;

export const runTournamentStandingsCreate = async (input: {
  tournament: StandingsCreateTournamentContext;
  provider: SofaScoreStandingsProvider;
}): Promise<TournamentStandingsCreateResult> => {
  const details = createEmptyDetails();
  const data = createEmptyReportData();
  const summary = createEmptySummary();

  if (input.tournament.mode === 'knockout-only') {
    details.unsupportedTournamentMode.push({
      reason: 'tournament_mode_not_supported',
      errorMessage: `Tournament mode "${input.tournament.mode}" does not support standings creation`,
    });

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  let payload: SofaScoreStandingsPayload;

  try {
    payload = await input.provider.fetchTournamentStandings({
      baseUrl: input.tournament.baseUrl,
    });
  } catch (error) {
    return buildProviderFailureResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
      error,
    });
  }

  if (!hasUsableStandings(payload)) {
    details.providerMissingStandings.push({
      reason: 'provider_response_missing_standings',
      errorMessage: 'Provider standings payload did not contain any usable standings rows',
    });
    summary.providerMissingStandingsCount = 1;

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  const teamExternalIds = extractStandingsTeamExternalIds(payload);

  if (teamExternalIds.length === 0) {
    details.providerMissingStandings.push({
      reason: 'provider_response_missing_standings',
      errorMessage: 'Provider standings payload did not contain any usable team identifiers',
    });
    summary.providerMissingStandingsCount = 1;

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  const resolvedTeams = await listTeamsByExternalId({
    provider: input.tournament.provider,
    externalIds: teamExternalIds,
  });

  const mapped = mapProviderStandings({
    tournamentId: input.tournament.tournamentId,
    provider: input.tournament.provider,
    payload,
    resolvedTeams,
  });

  summary.fetchedGroups = mapped.fetchedGroups;
  summary.fetchedRows = mapped.fetchedRows;
  summary.totalOperations = mapped.mappedRows.length + mapped.missingTeams.length;

  if (mapped.missingTeams.length > 0) {
    details.missingTeams.push(...mapped.missingTeams);
    data.missingTeamExternalIds.push(...collectUniqueMissingTeamExternalIds(mapped.missingTeams));
    summary.missingTeamsCount = mapped.missingTeams.length;
    summary.failedOperations = summary.totalOperations;
    summary.missingTeamExternalIdsPreview = data.missingTeamExternalIds.slice(0, SUMMARY_PREVIEW_LIMIT);

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  if (mapped.mappedRows.length === 0) {
    details.providerMissingStandings.push({
      reason: 'provider_response_missing_standings',
      errorMessage: 'Provider standings payload did not contain any creatable standings rows',
    });
    summary.providerMissingStandingsCount = 1;

    return buildResult({
      tournamentId: input.tournament.tournamentId,
      summary,
      details,
      data,
    });
  }

  try {
    const created = await insertTournamentStandings({
      rows: mapped.mappedRows,
    });

    details.created.push(...created);
    data.createdTeamIds.push(...created.map(detail => detail.teamId).filter(isNonEmptyString));

    summary.totalOperations = created.length;
    summary.successfulOperations = created.length;
    summary.createdRows = created.length;
    summary.createdTeamIdsPreview = data.createdTeamIds.slice(0, SUMMARY_PREVIEW_LIMIT);

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

const buildProviderFailureResult = (input: {
  tournamentId: string;
  summary: TournamentStandingsCreateSummary;
  details: TournamentStandingsCreateDetails;
  data: StandingsCreateReportData;
  error: unknown;
}): TournamentStandingsCreateResult => {
  if (input.error instanceof ProviderRequestError && input.error.status === 404) {
    input.details.providerMissingStandings.push({
      requestUrl: input.error.requestUrl,
      reason: 'provider_response_missing_standings',
      errorMessage: input.error.message,
      causeMessage: input.error.causeMessage,
      responseBodySnippet: input.error.responseBodySnippet,
    });
    input.summary.providerMissingStandingsCount = 1;
  } else {
    input.details.unexpectedFailures.push({
      requestUrl: input.error instanceof ProviderRequestError ? input.error.requestUrl : undefined,
      reason: 'unexpected_failure',
      errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
      causeMessage: input.error instanceof ProviderRequestError ? input.error.causeMessage : undefined,
      responseBodySnippet: input.error instanceof ProviderRequestError ? input.error.responseBodySnippet : undefined,
    });
  }

  return buildResult({
    tournamentId: input.tournamentId,
    summary: input.summary,
    details: input.details,
    data: input.data,
  });
};

const buildResult = (input: {
  tournamentId: string;
  summary: TournamentStandingsCreateSummary;
  details: TournamentStandingsCreateDetails;
  data: StandingsCreateReportData;
}): TournamentStandingsCreateResult => {
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

const createEmptySummary = (): TournamentStandingsCreateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedGroups: 0,
    fetchedRows: 0,
    createdRows: 0,
    missingTeamsCount: 0,
    providerMissingStandingsCount: 0,
  };
};

const createEmptyDetails = (): TournamentStandingsCreateDetails => {
  return {
    created: [],
    unsupportedTournamentMode: [],
    providerMissingStandings: [],
    missingTeams: [],
    unexpectedFailures: [],
  };
};

const createEmptyReportData = (): StandingsCreateReportData => {
  return {
    createdTeamIds: [],
    missingTeamExternalIds: [],
  };
};

const deriveWorkflowStatus = (input: {
  summary: TournamentStandingsCreateSummary;
  details: TournamentStandingsCreateDetails;
}): StandingsCreateWorkflowStatus => {
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

const hasUsableStandings = (payload: SofaScoreStandingsPayload): boolean => {
  if (!payload.standings.length) {
    return false;
  }

  return payload.standings.some(group => group.rows.length > 0);
};

const collectUniqueMissingTeamExternalIds = (missingTeams: StandingsCreateDetail[]): string[] => {
  return Array.from(new Set(missingTeams.map(detail => detail.teamExternalId).filter(isNonEmptyString)));
};

const isNonEmptyString = (value: string | undefined): value is string => {
  return typeof value === 'string' && value.trim() !== '';
};
