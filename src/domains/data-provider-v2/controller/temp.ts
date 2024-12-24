// @ts-nocheck
const updateMatchesForEachRound = async (tournament: DB_SelectTournament) => {
  // SELECTS ROUNDS WITH NO SCORE TO AVOID OVERCALLING THE API
  let ROUND_COUNT = 1;
  const scorelessMatchesIds = await getNonStartedMatches(tournament);

  while (ROUND_COUNT <= Number(1)) {
    const shouldFetchRound = scorelessMatchesIds.has(ROUND_COUNT);

    if (shouldFetchRound) {
      console.log(
        '[UPDATING ROUND]',
        ROUND_COUNT,
        ' - for: ',
        tournament?.provider,
        '--- tournament:',
        tournament.label
      );

      const round = await Api.fetchRound(tournament.roundsUrl, ROUND_COUNT);
      const matches = Api.mapRound(round, String(ROUND_COUNT), String(tournament.id));

      await db.transaction(async tx => {
        for (const match of matches) {
          await tx
            .update(T_Match)
            .set(match)
            .where(eq(T_Match.externalId, match.externalId));
        }
      });
    }

    ROUND_COUNT++;
  }
};

const createMatchesForEachRound = async (tournamentId: string) => {
  let ROUND_COUNT = 1;

  while (ROUND_COUNT <= Number(1)) {
    console.log(
      '[CREATING ROUND]',
      ROUND_COUNT,
      ' - for: ',
      tournament?.provider,
      '--- tournament:',
      tournament.label
    );

    const round = await Api.fetchRound(tournament.roundsUrl, ROUND_COUNT);
    const matches = Api.mapRound(round, String(ROUND_COUNT), String(tournament.id));
    await db.insert(T_Match).values(matches);

    ROUND_COUNT++;
  }
};

const getNonStartedMatches = async (tournament: DB_SelectTournament) => {
  const selectQuery = await db
    .selectDistinct({ roundId: T_Match.roundId })
    .from(T_Match)
    .where(
      and(eq(T_Match.tournamentId, tournament.id as string), eq(T_Match.status, 'open'))
    );

  return new Set(selectQuery.map(round => Number(round.roundId)));
};

standings: {
  fetchStandings: (baseUrl: string) => Promise<any>;
  mapStandings: (standings: any, tournamentId: string) =>
    Promise<DB_InsertTournamentStandings[]>;
  createOnDatabase: (standings: DB_InsertTournamentStandings[]) =>
    Promise<DB_InsertTournamentStandings[]>;
  updateOnDatabase: (standings: DB_InsertTournamentStandings[]) =>
    Promise<DB_InsertTournamentStandings[] | undefined>;
}
teams: {
  fetchAndStoreLogo: (data: FetchAndStoreAssetPayload) => Promise<any>;
  fetchTeamsFromStandings: (tournamentId: string) => Promise<any>;
  mapTeamsFromStandings: (standings: any, provider: string) => Promise<DB_InsertTeam[]>;
  createOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[]>;
  updateOnDatabase: (teams: DB_InsertTeam[]) => Promise<DB_InsertTeam[] | undefined>;
}

export type MatchesRequest = Request<{ tournamentId: string; round: number }, null, null>;

export type StandingsRequest = Request<{ tournamentId: string }, null, StandingsPayload>;
export type StandingsPayload = {
  standingsUrl: string;
};

export type TeamsRequestTeamsRequest = Request<{ tournamentId: string }, null, null>;

const update = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    const tournamentMode = tournament.mode;

    if (tournamentMode === 'regular-season-only') {
      return updateRegularSeasonTeams(tournamentId, tournament.provider);
    }

    if (tournamentMode === 'knockout-only') {
      return updateKnockoutSeasonTeams(
        tournamentId,
        tournament.baseUrl,
        tournament.provider
      );
    }

    return updateRegularAndKnockoutSeasonTeams(
      tournamentId,
      tournament.baseUrl,
      tournament.provider
    );
  } catch (error: any) {
    console.error('[ERROR] - updateTeams', error);
  }
};

const updateRegularSeasonTeams = async (baseUrl: string, provider: string) => {
  try {
    const standings = await SofascoreTeams.fetchTeamsFromStandings(baseUrl);
    const mappedTeams = await SofascoreTeams.mapTeamsFromStandings(standings, provider);
    const query = await SofascoreTeams.updateOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - updateRegularSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM STANDINGS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const setupKnockoutSeasonTeams = async (
  tournamentId: string,
  baseUrl: string,
  provider: string
) => {
  try {
    const allAvailableRounds = await TournamentQueries.allTournamentRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await SofascoreTeams.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await SofascoreTeams.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await SofascoreTeams.createOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupKnockoutSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM KNOCKOUT ROUNDS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const updateKnockoutSeasonTeams = async (
  tournamentId: string,
  baseUrl: string,
  provider: string
) => {
  try {
    const allAvailableRounds = await TournamentQueries.allTournamentRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await SofascoreTeams.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await SofascoreTeams.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await SofascoreTeams.updateOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - updateKnockoutSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM KNOCKOUT ROUNDS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const setupRegularAndKnockoutSeasonTeams = async (
  tournamentId: string,
  baseUrl: string,
  provider: string
) => {
  try {
    const allAvailableRounds = await TournamentQueries.allTournamentRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await SofascoreTeams.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await SofascoreTeams.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await SofascoreTeams.createOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupRegularAndKnockoutSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM KNOCKOUT ROUNDS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const updateRegularAndKnockoutSeasonTeams = async (
  tournamentId: string,
  baseUrl: string,
  provider: string
) => {
  try {
    const allAvailableRounds = await TournamentQueries.allTournamentRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await SofascoreTeams.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await SofascoreTeams.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await SofascoreTeams.updateOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - updateRegularAndKnockoutSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM KNOCKOUT ROUNDS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};
