import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  DiscoveredProviderTeam,
  TeamsInvalidProviderTeam,
  TeamsProviderSourceIssue,
  TeamsTournamentContext,
} from '@/domains/data-provider-v2/contracts/teams';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { buildSofaScoreTournamentStandingsUrl } from '@/domains/data-provider-v2/providers/sofascore/endpoints';
import { mapRoundProviderTeams, mapStandingsProviderTeams } from './map-provider-teams';

export type PreparedTournamentTeamsResult = {
  fetchedSources: number;
  discoveredTeams: DiscoveredProviderTeam[];
  providerMissingSources: TeamsProviderSourceIssue[];
  invalidProviderTeams: TeamsInvalidProviderTeam[];
};

export const prepareTournamentTeams = async (input: {
  tournament: TeamsTournamentContext;
  standingsProvider: SofaScoreStandingsProvider;
  roundProvider: SofaScoreRoundProvider;
}): Promise<PreparedTournamentTeamsResult> => {
  const discoveredTeams: DiscoveredProviderTeam[] = [];
  const providerMissingSources: TeamsProviderSourceIssue[] = [];
  const invalidProviderTeams: TeamsInvalidProviderTeam[] = [];
  let fetchedSources = 0;

  if (shouldUseStandingsSource(input.tournament.mode)) {
    fetchedSources++;

    try {
      const payload = await input.standingsProvider.fetchTournamentStandings({
        baseUrl: input.tournament.baseUrl,
      });

      if (!hasUsableStandings(payload)) {
        providerMissingSources.push({
          source: 'standings',
          kind: 'empty_payload',
          requestUrl: buildSofaScoreTournamentStandingsUrl(input.tournament.baseUrl),
          errorMessage: 'Provider standings payload did not contain any usable team rows',
        });
      } else {
        const mapped = mapStandingsProviderTeams({
          payload,
          requestUrl: buildSofaScoreTournamentStandingsUrl(input.tournament.baseUrl),
        });

        invalidProviderTeams.push(...mapped.invalidTeams);

        if (mapped.teams.length === 0) {
          providerMissingSources.push({
            source: 'standings',
            kind: 'no_mappable_teams',
            requestUrl: buildSofaScoreTournamentStandingsUrl(input.tournament.baseUrl),
            errorMessage: 'Provider standings payload did not contain any mappable teams',
          });
        } else {
          discoveredTeams.push(...mapped.teams);
        }
      }
    } catch (error) {
      providerMissingSources.push(
        buildProviderSourceIssue({
          source: 'standings',
          error,
          requestUrl: buildSofaScoreTournamentStandingsUrl(input.tournament.baseUrl),
        })
      );
    }
  }

  if (shouldUseKnockoutRoundsSource(input.tournament.mode)) {
    const knockoutRounds = await SERVICES_TOURNAMENT.getKnockoutRounds(input.tournament.tournamentId);

    if (knockoutRounds.length === 0) {
      fetchedSources++;
      providerMissingSources.push({
        source: 'knockout_round',
        kind: 'missing_rounds',
        errorMessage: 'Tournament does not have any stored knockout rounds to fetch teams from',
      });
    } else {
      for (const round of knockoutRounds) {
        fetchedSources++;

        try {
          const payload = await input.roundProvider.fetchTournamentRound({
            providerUrl: round.providerUrl,
          });

          if (!hasUsableRoundPayload(payload)) {
            providerMissingSources.push({
              source: 'knockout_round',
              roundId: round.id,
              roundLabel: round.label,
              roundSlug: round.slug,
              requestUrl: round.providerUrl,
              kind: 'empty_payload',
              errorMessage: `Knockout round "${round.slug}" did not contain any usable events`,
            });
            continue;
          }

          const mapped = mapRoundProviderTeams({
            payload,
            round,
          });

          invalidProviderTeams.push(...mapped.invalidTeams);

          if (mapped.teams.length === 0) {
            providerMissingSources.push({
              source: 'knockout_round',
              roundId: round.id,
              roundLabel: round.label,
              roundSlug: round.slug,
              requestUrl: round.providerUrl,
              kind: 'no_mappable_teams',
              errorMessage: `Knockout round "${round.slug}" did not contain any mappable teams`,
            });
            continue;
          }

          discoveredTeams.push(...mapped.teams);
        } catch (error) {
          providerMissingSources.push(
            buildProviderSourceIssue({
              source: 'knockout_round',
              error,
              round: {
                id: round.id,
                label: round.label,
                slug: round.slug,
                providerUrl: round.providerUrl,
              },
            })
          );
        }
      }
    }
  }

  return {
    fetchedSources,
    discoveredTeams: mergeDiscoveredTeams(discoveredTeams),
    providerMissingSources,
    invalidProviderTeams,
  };
};

const shouldUseStandingsSource = (mode: TeamsTournamentContext['mode']): boolean => {
  return mode === 'regular-season-only' || mode === 'regular-season-and-knockout';
};

const shouldUseKnockoutRoundsSource = (mode: TeamsTournamentContext['mode']): boolean => {
  return mode === 'knockout-only' || mode === 'regular-season-and-knockout';
};

const hasUsableStandings = (payload: { standings: Array<{ rows: unknown[] }> }): boolean => {
  return payload.standings.some(group => group.rows.length > 0);
};

const hasUsableRoundPayload = (payload: { events: unknown[] }): boolean => {
  return payload.events.length > 0;
};

const buildProviderSourceIssue = (input: {
  source: 'standings' | 'knockout_round';
  error: unknown;
  requestUrl?: string;
  round?: {
    id: string;
    label: string;
    slug: string;
    providerUrl: string;
  };
}): TeamsProviderSourceIssue => {
  if (input.error instanceof ProviderRequestError && input.error.status === 404) {
    return {
      source: input.source,
      roundId: input.round?.id,
      roundLabel: input.round?.label,
      roundSlug: input.round?.slug,
      requestUrl: input.error.requestUrl,
      kind: 'provider_404',
      errorMessage: input.error.message,
      causeMessage: input.error.causeMessage,
      responseBodySnippet: input.error.responseBodySnippet,
    };
  }

  return {
    source: input.source,
    roundId: input.round?.id,
    roundLabel: input.round?.label,
    roundSlug: input.round?.slug,
    requestUrl:
      input.error instanceof ProviderRequestError
        ? input.error.requestUrl
        : input.requestUrl ?? input.round?.providerUrl,
    kind: 'empty_payload',
    errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
    causeMessage: input.error instanceof ProviderRequestError ? input.error.causeMessage : undefined,
    responseBodySnippet: input.error instanceof ProviderRequestError ? input.error.responseBodySnippet : undefined,
  };
};

const mergeDiscoveredTeams = (teams: DiscoveredProviderTeam[]): DiscoveredProviderTeam[] => {
  const merged = new Map<string, DiscoveredProviderTeam>();

  for (const team of teams) {
    const existing = merged.get(team.externalId);

    if (!existing) {
      merged.set(team.externalId, {
        ...team,
        sources: [...team.sources],
      });
      continue;
    }

    existing.sources.push(...team.sources);

    if (!existing.shortName && team.shortName) {
      existing.shortName = team.shortName;
    }

    if (!existing.name && team.name) {
      existing.name = team.name;
    }
  }

  return Array.from(merged.values());
};
