import type {
  MappedTournamentStandingsRowInput,
  SofaScoreStandingsPayload,
  SofaScoreTeamEvent,
  SofaScoreTournamentTeamEventsPayload,
  StandingsForm,
  StandingsFormEntry,
  StandingsCreateDetail,
  StandingsResolvedTeam,
} from '@/domains/data-provider-v2/contracts/standings';

export const extractStandingsTeamExternalIds = (payload: SofaScoreStandingsPayload): string[] => {
  const teamExternalIds = new Set<string>();

  for (const group of payload.standings) {
    for (const row of group.rows) {
      const teamExternalId = normalizeString(row.team.id);

      if (teamExternalId) {
        teamExternalIds.add(teamExternalId);
      }
    }
  }

  return Array.from(teamExternalIds);
};

export const mapProviderStandings = (input: {
  tournamentId: string;
  provider: 'sofascore';
  payload: SofaScoreStandingsPayload;
  formsByTeamExternalId: Map<string, StandingsForm>;
  resolvedTeams: StandingsResolvedTeam[];
  requestUrl?: string;
}): {
  fetchedGroups: number;
  fetchedRows: number;
  mappedRows: MappedTournamentStandingsRowInput[];
  missingTeams: StandingsCreateDetail[];
} => {
  const teamMap = new Map(
    input.resolvedTeams.map(team => [buildTeamLookupKey(team.provider as 'sofascore', team.externalId), team])
  );

  const mappedRows: MappedTournamentStandingsRowInput[] = [];
  const missingTeams: StandingsCreateDetail[] = [];
  let fetchedRows = 0;

  for (const group of input.payload.standings) {
    for (const row of group.rows) {
      fetchedRows++;

      const teamExternalId = normalizeString(row.team.id);
      const teamName = normalizeString(row.team.name);
      const shortName = normalizeString(row.team.shortName);
      const resolvedTeam = teamMap.get(buildTeamLookupKey(input.provider, teamExternalId));

      if (!resolvedTeam) {
        missingTeams.push({
          teamExternalId,
          teamName,
          shortName,
          groupName: normalizeString(group.name),
          order: normalizeNumber(row.position),
          requestUrl: input.requestUrl,
          reason: 'provider_team_not_found_in_db',
          errorMessage: `Team "${teamExternalId}" is missing locally for provider "${input.provider}"`,
        });
        continue;
      }

      mappedRows.push({
        teamId: resolvedTeam.id,
        teamExternalId,
        tournamentId: input.tournamentId,
        order: normalizeNumber(row.position),
        groupName: normalizeString(group.name),
        shortName,
        longName: teamName,
        points: normalizeNumber(row.points),
        games: normalizeNumber(row.matches),
        wins: normalizeNumber(row.wins),
        draws: normalizeNumber(row.draws),
        losses: normalizeNumber(row.losses),
        form: input.formsByTeamExternalId.get(teamExternalId) ?? [],
        gf: normalizeNumber(row.scoresFor),
        ga: normalizeNumber(row.scoresAgainst),
        gd: normalizeNumber(row.scoreDiffFormatted),
        provider: input.provider,
      });
    }
  }

  return {
    fetchedGroups: input.payload.standings.length,
    fetchedRows,
    mappedRows: deduplicateRowsByShortName(mappedRows),
    missingTeams,
  };
};

export const mapProviderStandingsForm = (payload: SofaScoreTournamentTeamEventsPayload): Map<string, StandingsForm> => {
  const formsByTeamExternalId = new Map<string, StandingsForm>();

  for (const tournamentTeamEvents of Object.values(payload.tournamentTeamEvents ?? {})) {
    for (const [teamExternalId, events] of Object.entries(tournamentTeamEvents ?? {})) {
      const normalizedTeamExternalId = normalizeString(teamExternalId);

      if (!normalizedTeamExternalId) {
        continue;
      }

      const form = events
        .slice()
        .sort((left, right) => normalizeNumber(left.startTimestamp) - normalizeNumber(right.startTimestamp))
        .map(event => deriveFormEntry(normalizedTeamExternalId, event))
        .filter(isStandingsFormEntry)
        .slice(-5);

      formsByTeamExternalId.set(normalizedTeamExternalId, form);
    }
  }

  return formsByTeamExternalId;
};

const deduplicateRowsByShortName = (rows: MappedTournamentStandingsRowInput[]): MappedTournamentStandingsRowInput[] => {
  return Array.from(new Map(rows.map(row => [row.shortName, row])).values());
};

const deriveFormEntry = (teamExternalId: string, event: SofaScoreTeamEvent): StandingsFormEntry | undefined => {
  const winnerCode = normalizeNumber(event.winnerCode);
  const homeTeamExternalId = normalizeString(event.homeTeam?.id);
  const awayTeamExternalId = normalizeString(event.awayTeam?.id);
  const isHomeTeam = homeTeamExternalId === teamExternalId;
  const isAwayTeam = awayTeamExternalId === teamExternalId;

  if (!isHomeTeam && !isAwayTeam) {
    return undefined;
  }

  if (winnerCode === 3) {
    return 'D';
  }

  if (isHomeTeam && winnerCode === 1) {
    return 'W';
  }

  if (isAwayTeam && winnerCode === 2) {
    return 'W';
  }

  if (isHomeTeam && winnerCode === 2) {
    return 'L';
  }

  if (isAwayTeam && winnerCode === 1) {
    return 'L';
  }

  return undefined;
};

const buildTeamLookupKey = (provider: 'sofascore', externalId: string): string => {
  return `${provider}:${externalId}`;
};

const isStandingsFormEntry = (value: StandingsFormEntry | undefined): value is StandingsFormEntry => {
  return value === 'W' || value === 'D' || value === 'L';
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

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};
