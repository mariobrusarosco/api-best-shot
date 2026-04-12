import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  MappedTournamentStandingsRowInput,
  SofaScoreStandingsPayload,
  StandingsCreateDetail,
  StandingsCreateTournamentContext,
} from '@/domains/data-provider-v2/contracts/standings';
import { listTeamsByExternalId } from '@/domains/data-provider-v2/persistence/standings/list-teams-by-external-id';
import type { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import {
  extractStandingsTeamExternalIds,
  mapProviderStandings,
  mapProviderStandingsForm,
} from './map-provider-standings';

export type PreparedTournamentStandingsResult =
  | {
      outcome: 'unsupported_tournament_mode';
    }
  | {
      outcome: 'provider_missing_standings';
      kind: 'provider_404' | 'empty_payload' | 'missing_team_identifiers' | 'no_mappable_rows';
      requestUrl?: string;
      errorMessage: string;
      causeMessage?: string;
      responseBodySnippet?: string;
      fetchedGroups?: number;
      fetchedRows?: number;
      totalOperations?: number;
    }
  | {
      outcome: 'unexpected_failure';
      requestUrl?: string;
      errorMessage: string;
      causeMessage?: string;
      responseBodySnippet?: string;
    }
  | {
      outcome: 'ready';
      fetchedGroups: number;
      fetchedRows: number;
      totalOperations: number;
      mappedRows: MappedTournamentStandingsRowInput[];
      missingTeams: StandingsCreateDetail[];
      missingTeamExternalIds: string[];
    };

export const prepareTournamentStandings = async (input: {
  tournament: StandingsCreateTournamentContext;
  provider: SofaScoreStandingsProvider;
}): Promise<PreparedTournamentStandingsResult> => {
  if (input.tournament.mode === 'knockout-only') {
    return {
      outcome: 'unsupported_tournament_mode',
    };
  }

  let payload: SofaScoreStandingsPayload;

  try {
    payload = await input.provider.fetchTournamentStandings({
      baseUrl: input.tournament.baseUrl,
    });
  } catch (error) {
    if (error instanceof ProviderRequestError && error.status === 404) {
      return {
        outcome: 'provider_missing_standings',
        kind: 'provider_404',
        requestUrl: error.requestUrl,
        errorMessage: error.message,
        causeMessage: error.causeMessage,
        responseBodySnippet: error.responseBodySnippet,
      };
    }

    return {
      outcome: 'unexpected_failure',
      requestUrl: error instanceof ProviderRequestError ? error.requestUrl : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      causeMessage: error instanceof ProviderRequestError ? error.causeMessage : undefined,
      responseBodySnippet: error instanceof ProviderRequestError ? error.responseBodySnippet : undefined,
    };
  }

  if (!hasUsableStandings(payload)) {
    return {
      outcome: 'provider_missing_standings',
      kind: 'empty_payload',
      errorMessage: 'Provider standings payload did not contain any usable standings rows',
    };
  }

  const teamExternalIds = extractStandingsTeamExternalIds(payload);

  if (teamExternalIds.length === 0) {
    return {
      outcome: 'provider_missing_standings',
      kind: 'missing_team_identifiers',
      errorMessage: 'Provider standings payload did not contain any usable team identifiers',
    };
  }

  let resolvedTeams = null;
  let formsByTeamExternalId = null;

  try {
    const [resolvedTeamsResult, teamEventsPayload] = await Promise.all([
      listTeamsByExternalId({
        provider: input.tournament.provider,
        externalIds: teamExternalIds,
      }),
      input.provider.fetchTournamentTeamEvents({
        baseUrl: input.tournament.baseUrl,
      }),
    ]);

    resolvedTeams = resolvedTeamsResult;
    formsByTeamExternalId = mapProviderStandingsForm(teamEventsPayload);
  } catch (error) {
    return {
      outcome: 'unexpected_failure',
      requestUrl: error instanceof ProviderRequestError ? error.requestUrl : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      causeMessage: error instanceof ProviderRequestError ? error.causeMessage : undefined,
      responseBodySnippet: error instanceof ProviderRequestError ? error.responseBodySnippet : undefined,
    };
  }

  const mapped = mapProviderStandings({
    tournamentId: input.tournament.tournamentId,
    provider: input.tournament.provider,
    payload,
    formsByTeamExternalId,
    resolvedTeams,
  });

  const totalOperations = mapped.mappedRows.length + mapped.missingTeams.length;

  if (mapped.mappedRows.length === 0 && mapped.missingTeams.length === 0) {
    return {
      outcome: 'provider_missing_standings',
      kind: 'no_mappable_rows',
      errorMessage: 'Provider standings payload did not contain any mappable standings rows',
      fetchedGroups: mapped.fetchedGroups,
      fetchedRows: mapped.fetchedRows,
      totalOperations,
    };
  }

  return {
    outcome: 'ready',
    fetchedGroups: mapped.fetchedGroups,
    fetchedRows: mapped.fetchedRows,
    totalOperations,
    mappedRows: mapped.mappedRows,
    missingTeams: mapped.missingTeams,
    missingTeamExternalIds: collectUniqueMissingTeamExternalIds(mapped.missingTeams),
  };
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
