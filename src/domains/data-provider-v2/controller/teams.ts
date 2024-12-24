import { ApiProviderSofascore } from '@/domains/data-provider-v2/providers/sofascore';
import { TournamentQueries } from '@/domains/tournament/queries';
const Api = ApiProviderSofascore.teams;

const setupTeams = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    const tournamentMode = tournament.mode;

    if (tournamentMode === 'regular-season-only') {
      return setupRegularSeasonTeams(tournamentId, tournament.provider);
    }

    if (tournamentMode === 'knockout-only') {
      return setupKnockoutSeasonTeams(
        tournamentId,
        tournament.baseUrl,
        tournament.provider
      );
    }

    return setupRegularAndKnockoutSeasonTeams(
      tournamentId,
      tournament.baseUrl,
      tournament.provider
    );
  } catch (error: any) {
    console.error('[ERROR] - SetupTeams', error);
  }
};

const updateTeams = async (tournamentId: string) => {
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

const setupRegularSeasonTeams = async (baseUrl: string, provider: string) => {
  try {
    const standings = await Api.fetchTeamsFromStandings(baseUrl);
    const mappedTeams = await Api.mapTeamsFromStandings(standings, provider);
    const query = await Api.createOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupRegularSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM STANDINGS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const updateRegularSeasonTeams = async (baseUrl: string, provider: string) => {
  try {
    const standings = await Api.fetchTeamsFromStandings(baseUrl);
    const mappedTeams = await Api.mapTeamsFromStandings(standings, provider);
    const query = await Api.updateOnDatabase(mappedTeams);

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
    const allAvailableRounds = await TournamentQueries.allAvailableRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await Api.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await Api.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await Api.createOnDatabase(mappedTeams);

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
    const allAvailableRounds = await TournamentQueries.allAvailableRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await Api.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await Api.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await Api.updateOnDatabase(mappedTeams);

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
    const allAvailableRounds = await TournamentQueries.allAvailableRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await Api.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await Api.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await Api.createOnDatabase(mappedTeams);

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
    const allAvailableRounds = await TournamentQueries.allAvailableRounds(tournamentId);
    if (!allAvailableRounds) throw new Error('Tournament does not have rounds');

    const roundsGames = await Api.fetchTeamsFromAvailableRounds(
      allAvailableRounds,
      baseUrl
    );
    const mappedTeams = (
      await Api.mapTeamsFromAvailableRounds(roundsGames, provider)
    ).flat();

    const query = await Api.updateOnDatabase(mappedTeams);

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

export const TeamsDataController = {
  setupTeams,
  updateTeams,
};
