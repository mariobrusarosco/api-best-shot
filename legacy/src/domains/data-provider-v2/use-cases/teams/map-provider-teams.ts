import type {
  DiscoveredProviderTeam,
  SofaScoreRoundPayload,
  SofaScoreStandingsTeamsPayload,
  TeamsInvalidProviderTeam,
} from '@/domains/data-provider-v2/contracts/teams';

export const mapStandingsProviderTeams = (input: {
  payload: SofaScoreStandingsTeamsPayload;
  requestUrl?: string;
}): {
  teams: DiscoveredProviderTeam[];
  invalidTeams: TeamsInvalidProviderTeam[];
} => {
  const teams: DiscoveredProviderTeam[] = [];
  const invalidTeams: TeamsInvalidProviderTeam[] = [];

  for (const group of input.payload.standings) {
    for (const row of group.rows) {
      const externalId = normalizeString(row.team.id);
      const name = normalizeString(row.team.name);
      const shortName = normalizeString(row.team.shortName);

      if (!externalId || !name) {
        invalidTeams.push({
          source: 'standings',
          groupName: normalizeString(group.name),
          requestUrl: input.requestUrl,
          teamExternalId: externalId || undefined,
          teamName: name || undefined,
          shortName: shortName || undefined,
          errorMessage: 'Provider standings row is missing a usable team identifier or name',
        });
        continue;
      }

      teams.push({
        externalId,
        name,
        shortName,
        provider: 'sofascore',
        sources: [
          {
            source: 'standings',
            groupName: normalizeString(group.name),
            requestUrl: input.requestUrl,
          },
        ],
      });
    }
  }

  return {
    teams: mergeDiscoveredTeams(teams),
    invalidTeams,
  };
};

export const mapRoundProviderTeams = (input: {
  payload: SofaScoreRoundPayload;
  round: {
    id: string;
    label: string;
    slug: string;
    providerUrl: string;
  };
}): {
  teams: DiscoveredProviderTeam[];
  invalidTeams: TeamsInvalidProviderTeam[];
} => {
  const teams: DiscoveredProviderTeam[] = [];
  const invalidTeams: TeamsInvalidProviderTeam[] = [];

  for (const event of input.payload.events) {
    mapRoundTeam({
      rawTeam: event.homeTeam,
      round: input.round,
      teams,
      invalidTeams,
    });
    mapRoundTeam({
      rawTeam: event.awayTeam,
      round: input.round,
      teams,
      invalidTeams,
    });
  }

  return {
    teams: mergeDiscoveredTeams(teams),
    invalidTeams,
  };
};

export const collectDiscoveredTeamExternalIds = (teams: DiscoveredProviderTeam[]): string[] => {
  return teams.map(team => team.externalId);
};

const mapRoundTeam = (input: {
  rawTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  round: {
    id: string;
    label: string;
    slug: string;
    providerUrl: string;
  };
  teams: DiscoveredProviderTeam[];
  invalidTeams: TeamsInvalidProviderTeam[];
}): void => {
  const externalId = normalizeString(input.rawTeam.id);
  const name = normalizeString(input.rawTeam.name);
  const shortName = normalizeString(input.rawTeam.shortName);

  if (!externalId || !name) {
    input.invalidTeams.push({
      source: 'knockout_round',
      roundId: input.round.id,
      roundLabel: input.round.label,
      roundSlug: input.round.slug,
      requestUrl: input.round.providerUrl,
      teamExternalId: externalId || undefined,
      teamName: name || undefined,
      shortName: shortName || undefined,
      errorMessage: 'Provider round event is missing a usable team identifier or name',
    });
    return;
  }

  input.teams.push({
    externalId,
    name,
    shortName,
    provider: 'sofascore',
    sources: [
      {
        source: 'knockout_round',
        roundId: input.round.id,
        roundLabel: input.round.label,
        roundSlug: input.round.slug,
        requestUrl: input.round.providerUrl,
      },
    ],
  });
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

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
};
